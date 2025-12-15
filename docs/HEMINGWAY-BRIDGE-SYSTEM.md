# Hemingway Bridge System Documentation

**Agent 5 Deliverable** - System Initialization Project
**Implementation Date**: 2025-11-03
**Status**: ✅ COMPLETE - All 25 tests passing

---

## Executive Summary

The Hemingway Bridge System ensures users **always have an engagement point** to return to, implementing the "Hemingway Bridge" concept where content creators leave readers with a compelling reason to return.

**Core Principle**: At least 1 active bridge exists at all times for every user.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Priority Waterfall](#priority-waterfall)
4. [Database Schema](#database-schema)
5. [Services](#services)
6. [API Endpoints](#api-endpoints)
7. [Event System](#event-system)
8. [Testing](#testing)
9. [Usage Examples](#usage-examples)

---

## Overview

### What is a Hemingway Bridge?

A Hemingway Bridge is an **engagement point** that:
- Gives users a clear next action
- Maintains connection to the platform
- Adapts based on user behavior
- Never leaves users without direction

### Key Features

- ✅ **Always Active**: At least 1 bridge exists per user at all times
- ✅ **Priority-Based**: 5-level waterfall ensures best engagement point surfaces
- ✅ **Action-Triggered**: Updates automatically on user actions
- ✅ **Context-Aware**: Adapts to onboarding state, agent introductions, user activity

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                 HEMINGWAY BRIDGE SYSTEM                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────────┐
        │     BRIDGE PRIORITY SERVICE                  │
        │     (Calculate Best Bridge)                  │
        │                                              │
        │  Priority 1: Continue last interaction       │
        │  Priority 2: Next step in flow               │
        │  Priority 3: New feature introduction        │
        │  Priority 4: Engaging question               │
        │  Priority 5: Valuable insight                │
        └──────────────┬──────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────────────────┐
        │     HEMINGWAY BRIDGE SERVICE                 │
        │     (Manage Bridges)                         │
        │                                              │
        │  - Create/Update/Complete bridges            │
        │  - Ensure at least 1 active bridge           │
        │  - Track bridge state                        │
        └──────────────┬──────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────────────────┐
        │     BRIDGE UPDATE SERVICE                    │
        │     (Event Listeners)                        │
        │                                              │
        │  - post_created → Update bridge              │
        │  - comment_created → Update bridge           │
        │  - agent_mentioned → Update bridge           │
        │  - onboarding_response → Update bridge       │
        └──────────────────────────────────────────────┘
```

---

## Priority Waterfall

The system uses a **5-level priority waterfall** to determine the best engagement bridge:

### Priority 1: Continue Last Interaction
**Trigger**: User has recent activity (< 1 hour old)
**Example**: "Your recent comment is waiting for responses. Check back!"
**Use Case**: User created post/comment, agents are responding

### Priority 2: Next Step in Flow
**Trigger**: Onboarding incomplete or Phase 2 pending
**Examples**:
- "Let's finish getting to know you! Answer the onboarding questions above."
- "Ready to complete your setup? Tell me about your goals!"
**Use Case**: Guide user through structured onboarding

### Priority 3: New Feature Introduction
**Trigger**: Core agents not yet introduced
**Example**: "Meet Personal Todos Agent! A new agent is ready to help you."
**Use Case**: Progressive feature discovery

### Priority 4: Engaging Question
**Trigger**: No higher priority bridges
**Example**: "What's on your mind today? Create a post and your agents will respond!"
**Use Case**: Encourage active participation

### Priority 5: Valuable Insight (Fallback)
**Trigger**: Always available
**Example**: "Tip: You can mention @agent-name to get a specific agent's attention"
**Use Case**: Educational content, maintains connection

---

## Database Schema

### Table: `hemingway_bridges`

Tracks active engagement points for users.

```sql
CREATE TABLE hemingway_bridges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  bridge_type TEXT NOT NULL CHECK(
    bridge_type IN ('continue_thread', 'next_step', 'new_feature', 'question', 'insight')
  ),
  content TEXT NOT NULL,
  priority INTEGER NOT NULL CHECK(priority >= 1 AND priority <= 5),
  post_id TEXT,           -- Optional reference to post
  agent_id TEXT,          -- Optional reference to agent
  action TEXT,            -- Optional action to trigger
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
  created_at INTEGER NOT NULL,
  completed_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES user_settings(user_id) ON DELETE CASCADE
) STRICT;
```

**Indexes**:
- `idx_hemingway_bridges_user_active` - Fast lookup of active bridges
- `idx_hemingway_bridges_priority` - Priority-based queries

### Table: `agent_introductions`

Tracks which agents have been introduced to each user.

```sql
CREATE TABLE agent_introductions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  introduced_at INTEGER NOT NULL,
  post_id TEXT,
  interaction_count INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES user_settings(user_id) ON DELETE CASCADE,
  UNIQUE(user_id, agent_id)
) STRICT;
```

### Table: `onboarding_state`

Tracks user progress through onboarding phases.

```sql
CREATE TABLE onboarding_state (
  user_id TEXT PRIMARY KEY,
  phase INTEGER NOT NULL DEFAULT 1 CHECK(phase >= 1 AND phase <= 2),
  step TEXT CHECK(step IN ('name', 'use_case', 'comm_style', 'goals', 'agent_prefs')),
  phase1_completed INTEGER NOT NULL DEFAULT 0,
  phase1_completed_at INTEGER,
  phase2_completed INTEGER NOT NULL DEFAULT 0,
  phase2_completed_at INTEGER,
  responses TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES user_settings(user_id) ON DELETE CASCADE
) STRICT;
```

---

## Services

### 1. HemingwayBridgeService

**File**: `/api-server/services/engagement/hemingway-bridge-service.js`

**Methods**:
- `getActiveBridge(userId)` - Get highest priority active bridge
- `getAllActiveBridges(userId)` - Get all active bridges
- `createBridge(bridgeData)` - Create new bridge
- `updateBridge(bridgeId, updates)` - Update existing bridge
- `completeBridge(bridgeId)` - Mark bridge as completed
- `ensureBridgeExists(userId)` - Ensure at least 1 bridge exists
- `countActiveBridges(userId)` - Count active bridges for user

**Example**:
```javascript
const bridge = bridgeService.createBridge({
  userId: 'demo-user-123',
  type: 'continue_thread',
  content: 'Your post is live! Check back for responses.',
  priority: 1,
  postId: 'post-123'
});
```

### 2. BridgePriorityService

**File**: `/api-server/services/engagement/bridge-priority-service.js`

**Methods**:
- `calculatePriority(userId)` - Calculate best bridge using waterfall
- `getPriorityWaterfall(userId)` - Get all potential bridges ranked
- `isAgentIntroduced(userId, agentId)` - Check if agent introduced
- `getOnboardingState(userId)` - Get onboarding state

**Example**:
```javascript
const recommendation = priorityService.calculatePriority('demo-user-123');
// Returns: { type: 'next_step', content: '...', priority: 2, ... }
```

### 3. BridgeUpdateService

**File**: `/api-server/services/engagement/bridge-update-service.js`

**Methods**:
- `updateBridgeOnUserAction(userId, actionType, data)` - Update on action
- `recordAgentIntroduction(userId, agentId, postId)` - Record introduction
- `recalculateBridge(userId)` - Recalculate based on current state
- `ensureBridgeExists(userId)` - Ensure bridge exists

**Supported Actions**:
- `post_created` - User creates post
- `comment_created` - User creates comment
- `agent_mentioned` - User mentions agent
- `onboarding_response` - User responds to onboarding

**Example**:
```javascript
const bridge = updateService.updateBridgeOnUserAction(
  'demo-user-123',
  'post_created',
  { postId: 'post-123', content: 'My first post' }
);
```

---

## API Endpoints

### GET `/api/bridges/active/:userId`

Get active bridges for a user.

**Response**:
```json
{
  "success": true,
  "bridge": {
    "id": "bridge-123",
    "user_id": "demo-user-123",
    "bridge_type": "continue_thread",
    "content": "Your post is live!",
    "priority": 1,
    "active": 1
  },
  "allBridges": [...],
  "count": 1
}
```

### POST `/api/bridges/complete/:bridgeId`

Mark a bridge as completed.

**Response**:
```json
{
  "success": true,
  "bridge": { ... },
  "newBridge": { ... }
}
```

### POST `/api/bridges/create`

Create a new bridge.

**Request**:
```json
{
  "userId": "demo-user-123",
  "type": "question",
  "content": "What's on your mind?",
  "priority": 4
}
```

### GET `/api/bridges/waterfall/:userId`

Get complete priority waterfall.

**Response**:
```json
{
  "success": true,
  "waterfall": [
    { "type": "next_step", "priority": 2, ... },
    { "type": "question", "priority": 4, ... },
    { "type": "insight", "priority": 5, ... }
  ],
  "currentBridge": { ... }
}
```

### POST `/api/bridges/action/:userId`

Update bridge based on user action.

**Request**:
```json
{
  "actionType": "post_created",
  "actionData": {
    "postId": "post-123",
    "content": "My post"
  }
}
```

### POST `/api/bridges/recalculate/:userId`

Recalculate bridge for user.

---

## Event System

The Bridge Update Service listens for user actions and updates bridges automatically:

### post_created

```javascript
// User creates a post
updateService.updateBridgeOnUserAction('user-123', 'post_created', {
  postId: 'post-123',
  content: 'Check out https://example.com'
});

// Actions:
// 1. Deactivate old question/insight bridges
// 2. Create continue_thread bridge (priority 1)
// 3. If URL detected, trigger link-logger introduction
```

### comment_created

```javascript
// User creates a comment
updateService.updateBridgeOnUserAction('user-123', 'comment_created', {
  commentId: 'comment-123',
  postId: 'post-123'
});

// Actions:
// 1. Deactivate old bridges
// 2. Create continue_thread bridge referencing post
```

### agent_mentioned

```javascript
// User mentions an agent
updateService.updateBridgeOnUserAction('user-123', 'agent_mentioned', {
  agentId: 'personal-todos-agent',
  agentName: 'Personal Todos',
  postId: 'post-123'
});

// Actions:
// 1. Increment interaction count
// 2. Create continue_thread bridge awaiting agent response
```

---

## Testing

### Test Coverage

**✅ 25 tests passing** across 3 test suites:

#### Unit Tests (10 tests)
**File**: `/api-server/tests/unit/engagement/bridge-priority-service.test.js`

- ✅ Priority 1: Recent user interaction
- ✅ Priority 2: Incomplete Phase 1 onboarding
- ✅ Priority 2: Phase 2 trigger after 1 day
- ✅ Priority 3: Unintroduced core agent
- ✅ Priority 4: Engaging question
- ✅ Priority 5: Valuable insight
- ✅ Complete waterfall with all levels
- ✅ Agent introduction check
- ✅ Onboarding state retrieval
- ✅ Old interaction skips priority 1

#### Integration Tests (8 tests)
**File**: `/api-server/tests/integration/engagement/bridge-updates.test.js`

- ✅ Update bridge when user creates post
- ✅ Update bridge when user creates comment
- ✅ Update bridge when user mentions agent
- ✅ Contextual agent introduction on URL
- ✅ Recalculate bridge based on state
- ✅ Ensure bridge always exists
- ✅ Record agent introductions
- ✅ Update onboarding state

#### E2E Tests (7 tests)
**File**: `/api-server/tests/integration/engagement/bridge-always-exists-e2e.test.js`

- ✅ New user → bridge exists
- ✅ Complete Phase 1 → bridge exists
- ✅ Create post → bridge exists
- ✅ No activity → bridge exists
- ✅ Bridge persistence across actions
- ✅ Bridge recovery after clear
- ✅ Priority waterfall integrity

### Running Tests

```bash
cd api-server
npx vitest run tests/unit/engagement/
npx vitest run tests/integration/engagement/
```

---

## Usage Examples

### Example 1: New User Flow

```javascript
// 1. New user signs up
const userId = 'new-user-123';

// 2. Ensure bridge exists
const bridge = updateService.ensureBridgeExists(userId);

// Result: Default bridge created
// {
//   type: 'question',
//   content: "What's on your mind today?",
//   priority: 4
// }
```

### Example 2: Onboarding Flow

```javascript
// 1. User starts onboarding
const bridge1 = priorityService.calculatePriority(userId);
// Returns: { type: 'next_step', priority: 2 }

// 2. User completes Phase 1
updateService.updateOnboardingState(userId, {
  phase1_completed: 1,
  phase1_completed_at: Date.now() / 1000
});

// 3. Recalculate bridge
const bridge2 = updateService.recalculateBridge(userId);
// Returns: { type: 'new_feature', priority: 3 } (agent intro)
```

### Example 3: User Creates Post

```javascript
// User creates a post
const bridge = updateService.updateBridgeOnUserAction(userId, 'post_created', {
  postId: 'post-123',
  content: 'My first post!'
});

// Result:
// {
//   type: 'continue_thread',
//   content: 'Your post is live! Agents are reviewing it now.',
//   priority: 1,
//   postId: 'post-123'
// }
```

### Example 4: Complete Bridge Lifecycle

```javascript
// 1. Get active bridge
const activeBridge = bridgeService.getActiveBridge(userId);

// 2. User completes the action
bridgeService.completeBridge(activeBridge.id);

// 3. System creates new bridge automatically
const newBridge = updateService.recalculateBridge(userId);

// 4. Verify bridge exists
const count = bridgeService.countActiveBridges(userId);
console.log(count); // Always >= 1
```

---

## Integration with Server

### Initialize Routes

In your server file:

```javascript
import bridgeRoutes, { initializeBridgeRoutes } from './routes/bridges.js';

// Initialize with database
initializeBridgeRoutes(db);

// Mount routes
app.use('/api/bridges', bridgeRoutes);
```

### Integrate with Existing Systems

```javascript
// In your post creation handler
app.post('/api/posts', async (req, res) => {
  const post = await createPost(req.body);

  // Update bridge
  updateService.updateBridgeOnUserAction(req.user.id, 'post_created', {
    postId: post.id,
    content: post.content
  });

  res.json({ success: true, post });
});
```

---

## Performance Considerations

- **Prepared Statements**: All database queries use prepared statements
- **Indexes**: Optimized indexes on `user_id`, `active`, and `priority`
- **STRICT Mode**: SQLite STRICT mode ensures type safety
- **Minimal Queries**: Services minimize database round-trips
- **Efficient Waterfall**: Priority calculation short-circuits on first match

---

## Future Enhancements

1. **Personalized Questions**: Machine learning for better questions
2. **A/B Testing**: Test different bridge content
3. **Analytics**: Track bridge completion rates
4. **Multi-Bridge UI**: Show multiple bridges in UI
5. **Bridge Templates**: Configurable bridge content

---

## Support & Troubleshooting

### Common Issues

**Issue**: No bridges returned
**Solution**: Call `ensureBridgeExists(userId)` - always creates fallback

**Issue**: Wrong priority bridge
**Solution**: Check onboarding state and agent introductions

**Issue**: Foreign key constraint
**Solution**: Ensure user exists in `user_settings` before creating bridge

### Debug Mode

Enable detailed logging:

```javascript
// Set in service initialization
const bridgeService = createHemingwayBridgeService(db);
bridgeService.debugMode = true;
```

---

## Conclusion

The Hemingway Bridge System ensures **users always have a reason to return**, implementing a sophisticated priority waterfall that adapts to user behavior, onboarding state, and platform features.

**Key Achievement**: ✅ AC-5 Verified - At least 1 bridge active at all times

---

**Implementation**: Agent 5 - Hemingway Bridge Logic
**Tests**: 25/25 passing
**Date**: 2025-11-03
**Status**: ✅ PRODUCTION READY
