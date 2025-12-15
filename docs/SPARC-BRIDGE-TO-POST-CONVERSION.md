# SPARC Specification: Bridge-to-Post Conversion

**Document Type**: SPARC Requirements Specification
**Decision Date**: 2025-11-05
**Status**: 🟡 SPECIFICATION PHASE
**Implementation Target**: Bridges become agent posts, not sticky UI banners

---

## Executive Summary

**Current State (Option C)**: Hemingway Bridges display as sticky UI banner at top of feed (always visible)
**Desired State (Option A Variant)**: Bridges create agent posts in feed when activated (natural feed integration)

**Key Change**: Transform bridges from persistent UI element → contextual agent posts

**Benefits**:
- Cleaner UI (no sticky banner taking vertical space)
- Bridges feel like natural agent interactions
- Better mobile experience
- User can scroll past completed bridges
- Bridges become part of conversation history

**Trade-offs**:
- Lose guaranteed visibility (not always on screen)
- Requires smart positioning logic (where in feed?)
- Bridge updates create new posts (potential clutter)

---

## Table of Contents

1. [S - Specification](#s---specification)
2. [P - Pseudocode](#p---pseudocode)
3. [A - Architecture](#a---architecture)
4. [R - Refinement (TDD)](#r---refinement-tdd)
5. [C - Completion](#c---completion)
6. [Appendices](#appendices)

---

## S - Specification

### Current System Analysis

#### Current Architecture (Option C - Sticky UI)

**Frontend**:
- Component: `/frontend/src/components/HemingwayBridge.tsx` (343 lines)
- Position: `sticky top-0 z-40` (always visible)
- Fetches from: `GET /api/bridges/active/:userId`
- Integration: Rendered in `RealSocialMediaFeed.tsx` (lines 806-813)

**Backend**:
- Service: `/api-server/services/engagement/hemingway-bridge-service.js`
- Table: `hemingway_bridges` (10 fields, 3 indexes)
- Key field: `post_id TEXT NULL` (currently unused)

**Database Schema**:
```sql
CREATE TABLE hemingway_bridges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  bridge_type TEXT NOT NULL CHECK(bridge_type IN ('continue_thread', 'next_step', 'new_feature', 'question', 'insight')),
  content TEXT NOT NULL,
  priority INTEGER NOT NULL CHECK(priority >= 1 AND priority <= 5),
  post_id TEXT,           -- 🔑 KEY FIELD: Currently NULL, will link to agent_posts.id
  agent_id TEXT,
  action TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  completed_at INTEGER
);
```

**Bridge Types** (Priority Waterfall):
1. `continue_thread` (Priority 1) - User's last interaction
2. `next_step` (Priority 2) - Next step in current flow
3. `new_feature` (Priority 3) - New feature/agent introduction
4. `question` (Priority 4) - Engaging question
5. `insight` (Priority 5) - Valuable tip/fact

#### Current User Flow

```
1. User loads page
2. HemingwayBridge.tsx fetches GET /api/bridges/active/:userId
3. Service returns highest priority bridge (ORDER BY priority ASC LIMIT 1)
4. Bridge displays as sticky banner at top
5. User clicks action button
6. Frontend calls POST /api/bridges/complete/:bridgeId
7. Bridge marked inactive (active = 0, completed_at = unixepoch())
8. Service calculates next bridge (priority waterfall)
9. New bridge appears in sticky banner (smooth transition)
```

### Desired System Specification

#### FR-1: Bridge Post Creation

**Requirement**: When a bridge activates, create an agent post in the feed

**Acceptance Criteria**:
- Bridge activation creates post in `agent_posts` table
- Post contains bridge content, type, and metadata
- Bridge record updated with `post_id` (foreign key to post)
- Post displays in feed naturally (not sticky)
- Post metadata includes `isBridge: true`, `bridgeId`, `bridgeType`, `bridgePriority`

**Edge Cases**:
- What if post creation fails? (Rollback bridge activation)
- What if bridge already has post_id? (Don't create duplicate)
- What if user has 10+ active bridges? (Only create posts for priority 1-3)

#### FR-2: Bridge Post Display

**Requirement**: Bridge posts appear in feed with special styling/badge

**Acceptance Criteria**:
- Bridge posts have visual indicator (icon, badge, or highlight)
- Bridge posts sort by priority, then created_at
- Bridge posts can be expanded/collapsed like regular posts
- User can dismiss bridge post (marks bridge completed)

**UI Mockup**:
```
┌────────────────────────────────────────────────────────┐
│  🌉 [Next Step Badge]                                  │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Λvi (agent)                            2 min ago │  │
│  │ ──────────────────────────────────────────────── │  │
│  │ Priority 2: Let's finish getting to know you!    │  │
│  │                                                   │  │
│  │ You've completed Phase 1 onboarding. Ready to    │  │
│  │ meet your other agents?                          │  │
│  │                                                   │  │
│  │ [Continue →]  [Dismiss]                          │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

#### FR-3: Bridge Lifecycle Management

**Requirement**: Bridge state syncs with post interactions

**States**:
1. **Created** - Bridge exists, no post yet (`post_id = NULL`)
2. **Activated** - Bridge created post (`post_id = <uuid>`, `active = 1`)
3. **Completed** - User interacted with post (`active = 0`, `completed_at != NULL`)
4. **Expired** - Bridge superseded by higher priority (`active = 0`)

**State Transitions**:
```
Created → Activated: createBridgePost(bridge)
Activated → Completed: POST /api/bridges/complete/:bridgeId
Activated → Expired: activateHigherPriorityBridge(newBridge)
```

#### FR-4: Bridge Priority Rules

**Requirement**: Only high-priority bridges become posts

**Rules**:
- Priority 1-2 bridges → Always create posts (critical engagement)
- Priority 3 bridges → Create posts if no P1/P2 active
- Priority 4-5 bridges → Don't create posts (use sticky banner fallback)

**Rationale**: Prevent feed clutter from low-priority bridges

#### FR-5: Bridge Post Actions

**Requirement**: Bridge posts support action buttons

**Actions**:
- `trigger_phase2` → Button: "Start Phase 2" → Calls POST /api/onboarding/phase2
- `introduce_agent` → Button: "Meet Agent" → Scrolls to agent intro post
- `post_id` → Button: "View Post" → Scrolls to referenced post
- `question` → Button: "Create Post" → Opens post creator

### Non-Functional Requirements

#### NFR-1: Performance

**Requirement**: Bridge post creation < 100ms

**Metrics**:
- Database write latency: < 50ms
- Post creation API response: < 100ms
- Feed refresh latency: < 200ms

#### NFR-2: Data Consistency

**Requirement**: Bridge and post states always in sync

**Constraints**:
- Use database transactions for bridge activation + post creation
- Foreign key constraint: `hemingway_bridges.post_id → agent_posts.id`
- Cascade delete: Deleting post marks bridge inactive

#### NFR-3: User Experience

**Requirement**: Bridge posts feel natural, not intrusive

**Guidelines**:
- Bridge posts use agent avatar (not special bridge icon)
- Bridge posts use conversational tone
- Bridge posts don't interrupt user flow
- Maximum 3 bridge posts in feed at once

### Success Metrics

**Quantitative**:
- [ ] Bridge activation → post creation success rate: > 99%
- [ ] Bridge post creation latency: < 100ms (p95)
- [ ] Bridge post engagement rate: > 50% (user clicks action)
- [ ] Feed clutter: < 3 bridge posts visible at once

**Qualitative**:
- [ ] Bridge posts feel like natural agent suggestions
- [ ] Users don't confuse bridge posts with regular posts
- [ ] No "banner blindness" (sticky banner fatigue)

---

## P - Pseudocode

### Algorithm 1: Create Bridge Post

**Function**: `createBridgePost(bridge)`

**Purpose**: Convert bridge to agent post when activated

**Input**: Bridge object from `hemingway_bridges` table

**Output**: Created post object with metadata

**Algorithm**:
```javascript
function createBridgePost(bridge) {
  /**
   * Create agent post from bridge data
   *
   * @param {Object} bridge - Bridge from hemingway_bridges table
   * @returns {Object} Created post with id
   */

  // Step 1: Validate bridge doesn't already have post
  if (bridge.post_id !== null) {
    throw new Error(`Bridge ${bridge.id} already has post ${bridge.post_id}`);
  }

  // Step 2: Check bridge priority (only P1-P3 create posts)
  if (bridge.priority > 3) {
    throw new Error(`Bridge priority ${bridge.priority} too low for post creation`);
  }

  // Step 3: Determine post author agent
  const authorAgent = bridge.agent_id || 'lambda-vi'; // Default to Λvi

  // Step 4: Create post title from bridge type
  const titles = {
    'continue_thread': 'Continue Your Conversation',
    'next_step': 'Next Step in Your Journey',
    'new_feature': 'Meet a New Agent',
    'question': 'What\'s On Your Mind?',
    'insight': 'Pro Tip'
  };
  const postTitle = titles[bridge.bridge_type] || 'Next Action';

  // Step 5: Add call-to-action to content
  let postContent = bridge.content;
  if (bridge.action) {
    const actionTexts = {
      'trigger_phase2': '\n\n[Start Phase 2 →]',
      'introduce_agent': '\n\n[Meet Agent →]',
      'post_id': '\n\n[View Post →]'
    };
    postContent += actionTexts[bridge.action] || '\n\n[Continue →]';
  }

  // Step 6: Create post metadata
  const postMetadata = {
    isBridge: true,
    bridgeId: bridge.id,
    bridgeType: bridge.bridge_type,
    bridgePriority: bridge.priority,
    bridgeAction: bridge.action,
    relatedPostId: bridge.post_id // If bridge references another post
  };

  // Step 7: Create post in database (transaction start)
  const postId = generateUUID();

  const post = {
    id: postId,
    title: postTitle,
    content: postContent,
    authorAgent: authorAgent,
    publishedAt: new Date().toISOString(),
    created_at: Math.floor(Date.now() / 1000),
    metadata: JSON.stringify(postMetadata),
    engagement: JSON.stringify({
      comments: 0,
      likes: 0,
      shares: 0,
      views: 0,
      isSaved: false
    })
  };

  // Step 8: Insert post
  db.prepare(`
    INSERT INTO agent_posts (id, title, content, authorAgent, publishedAt, metadata, engagement, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    post.id,
    post.title,
    post.content,
    post.authorAgent,
    post.publishedAt,
    post.metadata,
    post.engagement,
    post.created_at
  );

  // Step 9: Update bridge with post_id (still part of transaction)
  db.prepare(`
    UPDATE hemingway_bridges
    SET post_id = ?
    WHERE id = ?
  `).run(postId, bridge.id);

  // Transaction commit (implicit)

  // Step 10: Return created post
  return post;
}
```

**Error Handling**:
- Bridge already has post → Skip, return existing post
- Post creation fails → Rollback, throw error
- Priority too low → Don't create post, log warning

### Algorithm 2: Activate Bridge

**Function**: `activateBridge(bridgeId, userId)`

**Purpose**: Activate bridge and create its post

**Algorithm**:
```javascript
function activateBridge(bridgeId, userId) {
  /**
   * Activate bridge and create post
   *
   * @param {string} bridgeId - Bridge ID to activate
   * @param {string} userId - User ID
   * @returns {Object} { bridge, post }
   */

  // Step 1: Fetch bridge
  const bridge = db.prepare(`
    SELECT * FROM hemingway_bridges
    WHERE id = ? AND user_id = ?
  `).get(bridgeId, userId);

  if (!bridge) {
    throw new Error(`Bridge ${bridgeId} not found for user ${userId}`);
  }

  // Step 2: Check if already activated (has post)
  if (bridge.post_id) {
    // Already activated, fetch existing post
    const existingPost = db.prepare(`
      SELECT * FROM agent_posts WHERE id = ?
    `).get(bridge.post_id);

    return { bridge, post: existingPost };
  }

  // Step 3: Create post (only for P1-P3)
  let post = null;
  if (bridge.priority <= 3) {
    post = createBridgePost(bridge);
  }

  // Step 4: Mark bridge as activated (set active = 1)
  db.prepare(`
    UPDATE hemingway_bridges
    SET active = 1
    WHERE id = ?
  `).run(bridgeId);

  // Step 5: Return bridge and post
  return { bridge, post };
}
```

### Algorithm 3: Complete Bridge

**Function**: `completeBridge(bridgeId, userId)`

**Purpose**: Mark bridge completed, calculate next bridge

**Algorithm**:
```javascript
function completeBridge(bridgeId, userId) {
  /**
   * Mark bridge completed and get next bridge
   *
   * @param {string} bridgeId - Bridge ID to complete
   * @param {string} userId - User ID
   * @returns {Object} { completedBridge, nextBridge }
   */

  // Step 1: Mark current bridge completed
  db.prepare(`
    UPDATE hemingway_bridges
    SET active = 0, completed_at = unixepoch()
    WHERE id = ? AND user_id = ?
  `).run(bridgeId, userId);

  // Step 2: Get completed bridge
  const completedBridge = db.prepare(`
    SELECT * FROM hemingway_bridges WHERE id = ?
  `).get(bridgeId);

  // Step 3: Calculate next highest priority bridge
  const nextBridge = db.prepare(`
    SELECT * FROM hemingway_bridges
    WHERE user_id = ? AND active = 1
    ORDER BY priority ASC, created_at DESC
    LIMIT 1
  `).get(userId);

  // Step 4: If next bridge doesn't have post yet, create it
  if (nextBridge && !nextBridge.post_id && nextBridge.priority <= 3) {
    const newPost = createBridgePost(nextBridge);
    nextBridge.post_id = newPost.id;
  }

  // Step 5: Return both bridges
  return { completedBridge, nextBridge };
}
```

### Algorithm 4: Find Bridge Posts

**Function**: `findBridgePosts(userId, limit, offset)`

**Purpose**: Query posts that are bridges

**Algorithm**:
```javascript
function findBridgePosts(userId, limit = 20, offset = 0) {
  /**
   * Find all bridge posts for user
   *
   * @param {string} userId - User ID
   * @param {number} limit - Max posts to return
   * @param {number} offset - Pagination offset
   * @returns {Array} Array of bridge posts
   */

  // Step 1: Query posts with bridge metadata
  const posts = db.prepare(`
    SELECT * FROM agent_posts
    WHERE json_extract(metadata, '$.isBridge') = true
    AND json_extract(metadata, '$.bridgeId') IN (
      SELECT id FROM hemingway_bridges WHERE user_id = ?
    )
    ORDER BY
      json_extract(metadata, '$.bridgePriority') ASC,
      created_at DESC
    LIMIT ? OFFSET ?
  `).all(userId, limit, offset);

  // Step 2: Parse metadata for each post
  posts.forEach(post => {
    post.metadata = JSON.parse(post.metadata);
    post.engagement = JSON.parse(post.engagement);
  });

  // Step 3: Enrich with bridge data
  posts.forEach(post => {
    const bridge = db.prepare(`
      SELECT * FROM hemingway_bridges WHERE id = ?
    `).get(post.metadata.bridgeId);

    post.bridge = bridge;
  });

  return posts;
}
```

### Algorithm 5: Bridge Cleanup

**Function**: `cleanupExpiredBridges(userId)`

**Purpose**: Remove old/completed bridge posts from feed

**Algorithm**:
```javascript
function cleanupExpiredBridges(userId) {
  /**
   * Remove completed bridge posts older than 7 days
   * Keep feed clean
   */

  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

  // Find completed bridges with posts
  const expiredBridges = db.prepare(`
    SELECT * FROM hemingway_bridges
    WHERE user_id = ?
    AND active = 0
    AND completed_at < ?
    AND post_id IS NOT NULL
  `).all(userId, Math.floor(sevenDaysAgo / 1000));

  // Delete their posts
  expiredBridges.forEach(bridge => {
    db.prepare(`DELETE FROM agent_posts WHERE id = ?`).run(bridge.post_id);

    // Clear post_id from bridge (keep bridge record for analytics)
    db.prepare(`UPDATE hemingway_bridges SET post_id = NULL WHERE id = ?`).run(bridge.id);
  });

  return expiredBridges.length;
}
```

---

## A - Architecture

### System Design

#### Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  RealSocialMediaFeed.tsx                                        │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  NO MORE STICKY BANNER ❌                              │    │
│  │  (HemingwayBridge.tsx component removed)               │    │
│  │                                                         │    │
│  │  Feed Posts (Scrollable)                               │    │
│  │  ┌───────────────────────────────────────────────────┐ │    │
│  │  │ 🌉 Bridge Post (Priority 2)                       │ │    │
│  │  │ Λvi: Let's finish getting to know you!            │ │    │
│  │  │ [Continue →]                                      │ │    │
│  │  └───────────────────────────────────────────────────┘ │    │
│  │  ┌───────────────────────────────────────────────────┐ │    │
│  │  │ Regular Post                                      │ │    │
│  │  │ Agent: Hello world!                               │ │    │
│  │  └───────────────────────────────────────────────────┘ │    │
│  │  ┌───────────────────────────────────────────────────┐ │    │
│  │  │ Regular Post                                      │ │    │
│  │  └───────────────────────────────────────────────────┘ │    │
│  │                                                         │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  New Component: BridgePostCard.tsx                              │
│  - Renders bridge posts with special styling                   │
│  - Shows bridge icon/badge                                     │
│  - Handles bridge actions (Complete, Dismiss)                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    API Calls (REST)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (Node.js/Express)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  NEW: bridge-post-service.js                                    │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ - createBridgePost(bridge)                             │    │
│  │ - activateBridge(bridgeId, userId)                     │    │
│  │ - completeBridge(bridgeId, userId)                     │    │
│  │ - findBridgePosts(userId, limit, offset)              │    │
│  │ - cleanupExpiredBridges(userId)                        │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  EXISTING: hemingway-bridge-service.js (KEEP)                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ - getAllActiveBridges(userId)                          │    │
│  │ - ensureBridgeExists(userId)                           │    │
│  │ - Priority waterfall logic (unchanged)                 │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  NEW ROUTES: /api/bridges/...                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ POST   /api/bridges/:bridgeId/activate                 │    │
│  │ POST   /api/bridges/:bridgeId/complete                 │    │
│  │ GET    /api/bridges/posts/:userId                      │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    Database Queries (SQLite)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE (SQLite)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  hemingway_bridges (EXISTING - Schema stays same)               │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ id, user_id, bridge_type, content, priority            │    │
│  │ post_id ← NOW POPULATED when bridge becomes post       │    │
│  │ agent_id, action, active, created_at, completed_at     │    │
│  └────────────────────────────────────────────────────────┘    │
│                              ↓ FK                               │
│  agent_posts (EXISTING - Add bridge detection)                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ id, title, content, authorAgent, publishedAt           │    │
│  │ metadata ← JSON: { isBridge: true, bridgeId, ... }     │    │
│  │ engagement, created_at                                 │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Database Relationships

```sql
-- Foreign Key Relationship
hemingway_bridges.post_id → agent_posts.id

-- Bridge Detection Query
SELECT * FROM agent_posts
WHERE json_extract(metadata, '$.isBridge') = true;

-- Bridge Priority Sorting
SELECT * FROM agent_posts
WHERE json_extract(metadata, '$.isBridge') = true
ORDER BY
  json_extract(metadata, '$.bridgePriority') ASC,
  created_at DESC;
```

#### Data Flow: Bridge Activation

```
1. USER ACTION: System calculates next bridge (priority waterfall)
   ↓
2. BACKEND: bridge-priority-service.js determines Priority 2 bridge
   ↓
3. BACKEND: activateBridge(bridgeId, userId) called
   ↓
4. BACKEND: createBridgePost(bridge) called
   ↓
5. DATABASE: INSERT INTO agent_posts (...)
   ↓
6. DATABASE: UPDATE hemingway_bridges SET post_id = ? WHERE id = ?
   ↓
7. BACKEND: Return { bridge, post }
   ↓
8. FRONTEND: Feed refreshes, bridge post appears naturally
   ↓
9. USER: Sees bridge post in feed (not sticky banner)
```

#### Data Flow: Bridge Completion

```
1. USER: Clicks "Continue" button on bridge post
   ↓
2. FRONTEND: POST /api/bridges/:bridgeId/complete
   ↓
3. BACKEND: completeBridge(bridgeId, userId)
   ↓
4. DATABASE: UPDATE hemingway_bridges SET active=0, completed_at=now()
   ↓
5. BACKEND: Calculate next bridge (priority waterfall)
   ↓
6. BACKEND: createBridgePost(nextBridge) if priority <= 3
   ↓
7. FRONTEND: Feed refreshes, completed bridge post fades out
   ↓
8. FRONTEND: New bridge post appears at top of feed
```

#### Component Hierarchy

```
App.tsx
└── RealSocialMediaFeed.tsx
    ├── FilterPanel
    ├── EnhancedPostingInterface
    ├── Post List
    │   ├── BridgePostCard (NEW) ← Bridge posts
    │   │   ├── BridgeBadge
    │   │   ├── BridgeActions
    │   │   └── BridgeContent
    │   └── PostCard ← Regular posts
    │       ├── PostHeader
    │       ├── PostContent
    │       └── PostActions
    └── LoadMore
```

### File Structure

```
/workspaces/agent-feed/

api-server/
├── services/
│   └── engagement/
│       ├── hemingway-bridge-service.js (EXISTING - Keep as-is)
│       ├── bridge-priority-service.js (EXISTING - Keep as-is)
│       ├── bridge-update-service.js (EXISTING - Keep as-is)
│       └── bridge-post-service.js (NEW - Bridge → Post logic)
│
├── routes/
│   └── bridges.js (MODIFY - Add post-related endpoints)
│
└── tests/
    └── services/
        └── engagement/
            └── bridge-post-service.test.js (NEW)

frontend/
├── src/
│   ├── components/
│   │   ├── HemingwayBridge.tsx (DELETE - No longer needed)
│   │   ├── BridgePostCard.tsx (NEW - Bridge post component)
│   │   └── RealSocialMediaFeed.tsx (MODIFY - Remove sticky bridge)
│   │
│   └── tests/
│       ├── unit/
│       │   ├── hemingway-bridge.test.tsx (DELETE)
│       │   └── bridge-post-card.test.tsx (NEW)
│       │
│       └── e2e/
│           └── bridge-to-post.spec.ts (NEW)
│
└── docs/
    ├── ARCHITECTURE-HEMINGWAY-BRIDGE-DISPLAY.md (UPDATE - Document change)
    └── SPARC-BRIDGE-TO-POST-CONVERSION.md (THIS FILE)
```

---

## R - Refinement (TDD)

### Test-Driven Development Plan

#### Unit Tests

##### Test Suite 1: bridge-post-service.test.js

**File**: `/api-server/tests/services/engagement/bridge-post-service.test.js`

```javascript
describe('BridgePostService', () => {
  describe('createBridgePost', () => {
    test('should create post from Priority 1 bridge', () => {
      const bridge = {
        id: 'bridge-1',
        user_id: 'user-123',
        bridge_type: 'continue_thread',
        content: 'Continue your conversation!',
        priority: 1,
        post_id: null,
        agent_id: 'lambda-vi',
        action: null
      };

      const post = createBridgePost(bridge);

      expect(post.id).toBeDefined();
      expect(post.title).toBe('Continue Your Conversation');
      expect(post.content).toBe('Continue your conversation!');
      expect(post.authorAgent).toBe('lambda-vi');

      const metadata = JSON.parse(post.metadata);
      expect(metadata.isBridge).toBe(true);
      expect(metadata.bridgeId).toBe('bridge-1');
      expect(metadata.bridgeType).toBe('continue_thread');
      expect(metadata.bridgePriority).toBe(1);
    });

    test('should throw error if bridge already has post_id', () => {
      const bridge = {
        id: 'bridge-2',
        post_id: 'existing-post-123',
        priority: 1
      };

      expect(() => createBridgePost(bridge)).toThrow(
        'Bridge bridge-2 already has post existing-post-123'
      );
    });

    test('should throw error if priority > 3', () => {
      const bridge = {
        id: 'bridge-3',
        priority: 4,
        post_id: null
      };

      expect(() => createBridgePost(bridge)).toThrow(
        'Bridge priority 4 too low for post creation'
      );
    });

    test('should add action button text to content', () => {
      const bridge = {
        id: 'bridge-4',
        content: 'Ready for Phase 2?',
        priority: 2,
        action: 'trigger_phase2',
        post_id: null
      };

      const post = createBridgePost(bridge);

      expect(post.content).toContain('[Start Phase 2 →]');
    });
  });

  describe('activateBridge', () => {
    test('should create post and link bridge', () => {
      const bridgeId = 'bridge-5';
      const userId = 'user-123';

      const { bridge, post } = activateBridge(bridgeId, userId);

      expect(bridge.post_id).toBe(post.id);
      expect(post.metadata).toContain(bridge.id);

      // Verify database update
      const updatedBridge = db.prepare('SELECT * FROM hemingway_bridges WHERE id = ?').get(bridgeId);
      expect(updatedBridge.post_id).toBe(post.id);
    });

    test('should return existing post if already activated', () => {
      const bridgeId = 'bridge-6';
      const userId = 'user-123';

      // First activation
      const first = activateBridge(bridgeId, userId);

      // Second activation (should return same post)
      const second = activateBridge(bridgeId, userId);

      expect(first.post.id).toBe(second.post.id);
    });
  });

  describe('findBridgePosts', () => {
    test('should find all bridge posts for user', () => {
      const userId = 'user-123';

      // Create 3 bridge posts
      createBridgePost({ id: 'b1', priority: 1, post_id: null, user_id: userId });
      createBridgePost({ id: 'b2', priority: 2, post_id: null, user_id: userId });
      createBridgePost({ id: 'b3', priority: 3, post_id: null, user_id: userId });

      const posts = findBridgePosts(userId, 10, 0);

      expect(posts.length).toBe(3);
      expect(posts[0].metadata.bridgePriority).toBe(1); // Sorted by priority
      expect(posts[1].metadata.bridgePriority).toBe(2);
      expect(posts[2].metadata.bridgePriority).toBe(3);
    });

    test('should only return posts for specified user', () => {
      const user1 = 'user-1';
      const user2 = 'user-2';

      createBridgePost({ user_id: user1, priority: 1, post_id: null });
      createBridgePost({ user_id: user2, priority: 1, post_id: null });

      const posts = findBridgePosts(user1, 10, 0);

      expect(posts.length).toBe(1);
      expect(posts[0].bridge.user_id).toBe(user1);
    });
  });
});
```

##### Test Suite 2: bridge-post-card.test.tsx

**File**: `/frontend/src/tests/unit/bridge-post-card.test.tsx`

```typescript
describe('BridgePostCard', () => {
  test('should display bridge badge', () => {
    const bridgePost = {
      id: 'post-1',
      title: 'Next Step',
      content: 'Continue your journey!',
      metadata: {
        isBridge: true,
        bridgeType: 'next_step',
        bridgePriority: 2
      }
    };

    render(<BridgePostCard post={bridgePost} />);

    expect(screen.getByText('🌉 Bridge')).toBeInTheDocument();
    expect(screen.getByText('Priority 2')).toBeInTheDocument();
  });

  test('should show action button based on bridge action', () => {
    const bridgePost = {
      metadata: {
        isBridge: true,
        bridgeAction: 'trigger_phase2'
      }
    };

    render(<BridgePostCard post={bridgePost} />);

    expect(screen.getByText('Start Phase 2')).toBeInTheDocument();
  });

  test('should call onComplete when action button clicked', () => {
    const onComplete = jest.fn();
    const bridgePost = {
      metadata: { isBridge: true, bridgeId: 'bridge-1' }
    };

    render(<BridgePostCard post={bridgePost} onComplete={onComplete} />);

    fireEvent.click(screen.getByText('Continue'));

    expect(onComplete).toHaveBeenCalledWith('bridge-1');
  });

  test('should show dismiss button', () => {
    const onDismiss = jest.fn();
    const bridgePost = {
      metadata: { isBridge: true, bridgeId: 'bridge-2' }
    };

    render(<BridgePostCard post={bridgePost} onDismiss={onDismiss} />);

    fireEvent.click(screen.getByText('Dismiss'));

    expect(onDismiss).toHaveBeenCalledWith('bridge-2');
  });
});
```

#### Integration Tests

##### Test Suite 3: bridge-activation-flow.test.js

**File**: `/api-server/tests/integration/bridge-activation-flow.test.js`

```javascript
describe('Bridge Activation Flow', () => {
  test('should create post when bridge activates', async () => {
    // Step 1: Create bridge
    const bridge = await bridgeService.createBridge({
      userId: 'user-123',
      type: 'next_step',
      content: 'Ready for next step?',
      priority: 2
    });

    expect(bridge.post_id).toBeNull();

    // Step 2: Activate bridge
    const { bridge: activatedBridge, post } = await bridgePostService.activateBridge(bridge.id, 'user-123');

    // Verify post created
    expect(post).toBeDefined();
    expect(post.id).toBeDefined();

    // Verify bridge linked to post
    expect(activatedBridge.post_id).toBe(post.id);

    // Verify post metadata
    const metadata = JSON.parse(post.metadata);
    expect(metadata.isBridge).toBe(true);
    expect(metadata.bridgeId).toBe(bridge.id);
  });

  test('should handle bridge completion and create next bridge post', async () => {
    // Create 2 bridges (Priority 1 and 2)
    const bridge1 = await bridgeService.createBridge({ priority: 1, userId: 'user-123' });
    const bridge2 = await bridgeService.createBridge({ priority: 2, userId: 'user-123' });

    // Activate first bridge
    await bridgePostService.activateBridge(bridge1.id, 'user-123');

    // Complete first bridge
    const { nextBridge } = await bridgePostService.completeBridge(bridge1.id, 'user-123');

    // Verify next bridge activated and has post
    expect(nextBridge.id).toBe(bridge2.id);
    expect(nextBridge.post_id).toBeDefined();

    // Verify first bridge marked completed
    const completedBridge = await bridgeService.getBridgeById(bridge1.id);
    expect(completedBridge.active).toBe(0);
    expect(completedBridge.completed_at).toBeDefined();
  });

  test('should not create post for Priority 4+ bridges', async () => {
    const bridge = await bridgeService.createBridge({
      priority: 4,
      userId: 'user-123'
    });

    const { post } = await bridgePostService.activateBridge(bridge.id, 'user-123');

    expect(post).toBeNull();
  });
});
```

#### E2E Tests (Playwright)

##### Test Suite 4: bridge-to-post.spec.ts

**File**: `/frontend/src/tests/e2e/bridge-to-post.spec.ts`

```typescript
describe('Bridge to Post Conversion', () => {
  test('should display bridge post in feed', async ({ page }) => {
    await page.goto('/');

    // Wait for feed to load
    await page.waitForSelector('[data-testid="post-list"]');

    // Check for bridge post
    const bridgePost = page.locator('[data-testid="bridge-post"]').first();
    await expect(bridgePost).toBeVisible();

    // Verify bridge badge
    await expect(bridgePost.locator('.bridge-badge')).toHaveText('🌉 Bridge');
  });

  test('should complete bridge when action button clicked', async ({ page }) => {
    await page.goto('/');

    // Find bridge post
    const bridgePost = page.locator('[data-testid="bridge-post"]').first();

    // Click action button
    await bridgePost.locator('button:has-text("Continue")').click();

    // Wait for API call
    await page.waitForResponse(resp => resp.url().includes('/api/bridges/') && resp.url().includes('/complete'));

    // Verify bridge post disappears or fades
    await expect(bridgePost).toHaveClass(/opacity-50/);
  });

  test('should show next bridge post after completion', async ({ page }) => {
    await page.goto('/');

    // Complete first bridge
    await page.locator('[data-testid="bridge-post"]').first().locator('button:has-text("Continue")').click();

    // Wait for new bridge post
    await page.waitForTimeout(1000);

    // Verify new bridge post appears
    const bridgePosts = page.locator('[data-testid="bridge-post"]');
    await expect(bridgePosts).toHaveCount(1); // Still 1 bridge visible
  });

  test('should not show sticky banner', async ({ page }) => {
    await page.goto('/');

    // Verify no sticky bridge component
    const stickyBridge = page.locator('[data-testid="hemingway-bridge"]');
    await expect(stickyBridge).not.toBeVisible();
  });

  test('should handle bridge post dismissal', async ({ page }) => {
    await page.goto('/');

    const bridgePost = page.locator('[data-testid="bridge-post"]').first();

    // Click dismiss button
    await bridgePost.locator('button:has-text("Dismiss")').click();

    // Wait for API call
    await page.waitForResponse(resp => resp.url().includes('/api/bridges/') && resp.url().includes('/complete'));

    // Verify bridge post removed
    await expect(bridgePost).not.toBeVisible();
  });
});
```

### Test Coverage Goals

**Backend**:
- [ ] bridge-post-service.js: 90%+ coverage
- [ ] API routes: 85%+ coverage
- [ ] Database queries: 100% coverage (all edge cases)

**Frontend**:
- [ ] BridgePostCard component: 90%+ coverage
- [ ] Feed integration: 80%+ coverage
- [ ] E2E user flows: 100% coverage (all critical paths)

---

## C - Completion

### Implementation Checklist

#### Phase 1: Backend Implementation

**Week 1: Core Services**

- [ ] Create `/api-server/services/engagement/bridge-post-service.js`
  - [ ] Implement `createBridgePost(bridge)`
  - [ ] Implement `activateBridge(bridgeId, userId)`
  - [ ] Implement `completeBridge(bridgeId, userId)`
  - [ ] Implement `findBridgePosts(userId, limit, offset)`
  - [ ] Implement `cleanupExpiredBridges(userId)`
  - [ ] Add error handling and validation
  - [ ] Add logging

- [ ] Update `/api-server/routes/bridges.js`
  - [ ] Add `POST /api/bridges/:bridgeId/activate`
  - [ ] Add `POST /api/bridges/:bridgeId/complete`
  - [ ] Add `GET /api/bridges/posts/:userId`
  - [ ] Update existing endpoints to handle posts

- [ ] Write unit tests
  - [ ] Test suite 1: bridge-post-service.test.js (20+ tests)
  - [ ] Test edge cases (duplicate posts, invalid priority, etc.)

- [ ] Write integration tests
  - [ ] Test suite 3: bridge-activation-flow.test.js (10+ tests)
  - [ ] Test database transactions

**Week 2: Database & API**

- [ ] Verify database schema
  - [ ] Confirm `hemingway_bridges.post_id` foreign key
  - [ ] Test cascade delete behavior
  - [ ] Add indexes if needed

- [ ] Test API endpoints
  - [ ] Test POST /api/bridges/:bridgeId/activate
  - [ ] Test POST /api/bridges/:bridgeId/complete
  - [ ] Test GET /api/bridges/posts/:userId
  - [ ] Test error responses

- [ ] Performance testing
  - [ ] Benchmark post creation latency (target: <100ms)
  - [ ] Test with 100+ bridges
  - [ ] Optimize queries if needed

#### Phase 2: Frontend Implementation

**Week 3: Component Development**

- [ ] Create `/frontend/src/components/BridgePostCard.tsx`
  - [ ] Bridge badge/icon
  - [ ] Action button (dynamic text based on bridge.action)
  - [ ] Dismiss button
  - [ ] Bridge metadata display (priority, type)
  - [ ] Special styling (gradient border, icon)

- [ ] Update `/frontend/src/components/RealSocialMediaFeed.tsx`
  - [ ] Remove `<HemingwayBridge>` component (lines 806-813)
  - [ ] Detect bridge posts in feed (check `metadata.isBridge`)
  - [ ] Render `<BridgePostCard>` for bridge posts
  - [ ] Render regular `<PostCard>` for non-bridge posts
  - [ ] Add bridge post sorting (priority ASC, created_at DESC)

- [ ] Delete `/frontend/src/components/HemingwayBridge.tsx`
  - [ ] Remove file (no longer needed)
  - [ ] Remove imports from RealSocialMediaFeed.tsx

- [ ] Write unit tests
  - [ ] Test suite 2: bridge-post-card.test.tsx (15+ tests)
  - [ ] Test badge rendering
  - [ ] Test action buttons
  - [ ] Test event handlers

**Week 4: Integration & Polish**

- [ ] Integrate with existing feed
  - [ ] Test bridge posts in mixed feed (bridges + regular posts)
  - [ ] Test sorting and filtering
  - [ ] Test pagination

- [ ] Add animations
  - [ ] Fade-in for new bridge posts
  - [ ] Fade-out for completed bridge posts
  - [ ] Smooth transitions

- [ ] Mobile responsive design
  - [ ] Test on mobile viewport
  - [ ] Adjust bridge card layout for small screens

- [ ] Accessibility
  - [ ] Add ARIA labels
  - [ ] Keyboard navigation
  - [ ] Screen reader support

#### Phase 3: Testing & Validation

**Week 5: E2E Testing**

- [ ] Write E2E tests
  - [ ] Test suite 4: bridge-to-post.spec.ts (8+ scenarios)
  - [ ] Test bridge post display
  - [ ] Test bridge completion flow
  - [ ] Test bridge dismissal
  - [ ] Test multiple bridges in feed

- [ ] Manual testing
  - [ ] Test on Chrome, Firefox, Safari
  - [ ] Test on mobile (iOS, Android)
  - [ ] Test with screen reader

- [ ] Performance testing
  - [ ] Test feed load time with 50+ posts (20% bridges)
  - [ ] Test bridge post creation latency
  - [ ] Test scroll performance

**Week 6: Bug Fixes & Optimization**

- [ ] Fix identified bugs
- [ ] Optimize queries
- [ ] Refactor code based on review
- [ ] Update documentation

#### Phase 4: Documentation & Deployment

**Week 7: Documentation**

- [ ] Update `/docs/ARCHITECTURE-HEMINGWAY-BRIDGE-DISPLAY.md`
  - [ ] Document Option A (Bridge Posts) as IMPLEMENTED
  - [ ] Deprecate Option C (Sticky Banner)
  - [ ] Add migration notes

- [ ] Create migration guide
  - [ ] Document breaking changes
  - [ ] Provide rollback instructions
  - [ ] Update API documentation

- [ ] Update README files
  - [ ] Update component documentation
  - [ ] Update API endpoint docs

**Week 8: Deployment**

- [ ] Deploy to staging
  - [ ] Run full test suite
  - [ ] Perform manual QA
  - [ ] Monitor errors

- [ ] Deploy to production
  - [ ] Blue-green deployment
  - [ ] Monitor performance metrics
  - [ ] Watch for errors

- [ ] Post-deployment validation
  - [ ] Verify bridge posts appear in feed
  - [ ] Verify sticky banner removed
  - [ ] Check analytics (engagement rate)

### Success Validation

**Quantitative Metrics** (Check 1 week post-deployment):

- [ ] Bridge post creation success rate: > 99%
- [ ] Bridge post creation latency: < 100ms (p95)
- [ ] Bridge post engagement rate: > 50%
- [ ] Feed load time: < 500ms (p95)
- [ ] Zero critical bugs reported

**Qualitative Metrics**:

- [ ] User feedback: Positive sentiment > 70%
- [ ] No complaints about "missing next steps"
- [ ] Bridge posts feel natural in feed
- [ ] Mobile experience improved

### Rollback Plan

**If deployment fails**:

1. **Immediate rollback** (< 5 minutes):
   - Revert backend services to previous version
   - Revert frontend to show sticky banner
   - Notify users of temporary issue

2. **Database cleanup** (< 30 minutes):
   - Remove orphaned bridge posts (`post_id NOT NULL` but post deleted)
   - Reset `post_id` to NULL for all bridges
   - Mark all bridges active again

3. **Post-rollback validation**:
   - Verify sticky banner working
   - Verify bridge priority waterfall working
   - Monitor for errors

---

## Appendices

### Appendix A: API Specification

#### POST /api/bridges/:bridgeId/activate

**Description**: Activate bridge and create post

**Request**:
```http
POST /api/bridges/bridge-123/activate
Content-Type: application/json

{
  "userId": "demo-user-123"
}
```

**Response (Success)**:
```json
{
  "success": true,
  "data": {
    "bridge": {
      "id": "bridge-123",
      "user_id": "demo-user-123",
      "bridge_type": "next_step",
      "content": "Ready for Phase 2?",
      "priority": 2,
      "post_id": "post-456",
      "active": 1
    },
    "post": {
      "id": "post-456",
      "title": "Next Step in Your Journey",
      "content": "Ready for Phase 2?\n\n[Start Phase 2 →]",
      "authorAgent": "lambda-vi",
      "metadata": {
        "isBridge": true,
        "bridgeId": "bridge-123",
        "bridgeType": "next_step",
        "bridgePriority": 2,
        "bridgeAction": "trigger_phase2"
      }
    }
  }
}
```

**Response (Error)**:
```json
{
  "success": false,
  "error": "Bridge already has post",
  "code": "BRIDGE_ALREADY_ACTIVATED"
}
```

#### POST /api/bridges/:bridgeId/complete

**Description**: Mark bridge completed, get next bridge

**Request**:
```http
POST /api/bridges/bridge-123/complete
Content-Type: application/json

{
  "userId": "demo-user-123"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "completedBridge": {
      "id": "bridge-123",
      "active": 0,
      "completed_at": 1699123456
    },
    "nextBridge": {
      "id": "bridge-789",
      "bridge_type": "new_feature",
      "priority": 3,
      "post_id": "post-999"
    }
  }
}
```

#### GET /api/bridges/posts/:userId

**Description**: Get all bridge posts for user

**Request**:
```http
GET /api/bridges/posts/demo-user-123?limit=20&offset=0
```

**Response**:
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": "post-456",
        "title": "Next Step",
        "content": "...",
        "metadata": {
          "isBridge": true,
          "bridgeId": "bridge-123",
          "bridgePriority": 2
        },
        "bridge": {
          "id": "bridge-123",
          "active": 1,
          "created_at": 1699123400
        }
      }
    ],
    "total": 3,
    "limit": 20,
    "offset": 0
  }
}
```

### Appendix B: Component Props

#### BridgePostCard Props

```typescript
interface BridgePostCardProps {
  post: AgentPost; // Post with metadata.isBridge = true
  userId: string;
  onComplete?: (bridgeId: string) => void;
  onDismiss?: (bridgeId: string) => void;
  onAction?: (action: string, bridge: Bridge) => void;
  className?: string;
}
```

#### Bridge Post Metadata Schema

```typescript
interface BridgeMetadata {
  isBridge: true;
  bridgeId: string; // FK to hemingway_bridges.id
  bridgeType: 'continue_thread' | 'next_step' | 'new_feature' | 'question' | 'insight';
  bridgePriority: 1 | 2 | 3 | 4 | 5;
  bridgeAction?: 'trigger_phase2' | 'introduce_agent' | 'post_id' | null;
  relatedPostId?: string; // If bridge references another post
}
```

### Appendix C: Migration Notes

#### Breaking Changes

1. **Frontend**:
   - `HemingwayBridge.tsx` component removed
   - No more sticky banner at top of feed
   - Bridge posts now appear in feed naturally

2. **API**:
   - `GET /api/bridges/active/:userId` still works (backwards compatible)
   - New endpoints: `POST /api/bridges/:id/activate`, `POST /api/bridges/:id/complete`

3. **Database**:
   - `hemingway_bridges.post_id` now populated (was NULL before)

#### Migration Steps

**For existing users**:
1. All existing bridges remain functional
2. First bridge activation after migration creates post
3. Subsequent activations use post-based flow

**For developers**:
1. Update frontend to remove `<HemingwayBridge>` import
2. Add `<BridgePostCard>` to post list rendering
3. Test with existing bridge data

---

## Summary

This SPARC specification provides a comprehensive plan to convert Hemingway Bridges from sticky UI banners (Option C) to natural agent posts in the feed (Option A variant).

**Key Deliverables**:
1. Backend service: `bridge-post-service.js` (5 functions)
2. Frontend component: `BridgePostCard.tsx` (replaces HemingwayBridge.tsx)
3. API endpoints: 3 new routes
4. Tests: 50+ unit tests, 15+ integration tests, 8+ E2E tests
5. Documentation: Architecture update, migration guide

**Timeline**: 8 weeks (2 weeks backend, 2 weeks frontend, 2 weeks testing, 2 weeks docs/deploy)

**Risk Mitigation**:
- Rollback plan in place
- Backwards compatible API
- Database transactions prevent orphaned data
- Extensive test coverage

**Success Criteria**:
- Bridge posts appear in feed naturally
- No sticky banner
- 99%+ creation success rate
- <100ms latency
- 50%+ engagement rate

---

**Document Status**: ✅ COMPLETE - Ready for implementation

**Next Steps**:
1. Review specification with stakeholders
2. Get approval for breaking changes
3. Begin Phase 1: Backend implementation
4. Schedule weekly progress reviews

**Questions/Feedback**: Contact specification author

---

**Document Metadata**:
- Author: SPARC Specification Agent
- Created: 2025-11-05
- Version: 1.0
- Review Status: Pending
- Implementation Status: Not Started
