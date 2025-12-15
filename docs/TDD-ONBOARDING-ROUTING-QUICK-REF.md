# TDD Onboarding Routing - Quick Reference

**Status:** RED PHASE COMPLETE ✅
**Test File:** `/tests/unit/onboarding-comment-routing.test.js`
**Lines of Code:** 33,001 bytes (865 lines)
**Framework:** Vitest + better-sqlite3

---

## Quick Stats

```
Tests Written:  30 total
  ✓ Passing:    8 tests (edge cases)
  ✗ Failing:    22 tests (core logic - expected)

Test Coverage:
  FR-1: Comment Routing           → 5/8 failing ❌
  FR-2: Get-to-Know-You Responses → 10/10 failing ❌
  FR-3: Avi Welcome Post          → 5/5 failing ❌
  Edge Cases:                     → 3/7 failing ❌
  Integration:                    → 1/1 failing ❌
```

---

## Run Tests

```bash
# Run all tests
npx vitest run tests/unit/onboarding-comment-routing.test.js

# Run with verbose output
npx vitest run tests/unit/onboarding-comment-routing.test.js --reporter=verbose

# Watch mode (auto-rerun on file changes)
npx vitest watch tests/unit/onboarding-comment-routing.test.js

# Run specific test suite
npx vitest run tests/unit/onboarding-comment-routing.test.js -t "FR-1"
npx vitest run tests/unit/onboarding-comment-routing.test.js -t "FR-2"
npx vitest run tests/unit/onboarding-comment-routing.test.js -t "FR-3"
```

---

## Implementation Priorities

### Priority 1: Comment Routing (FR-1)
**File:** `/api-server/avi/orchestrator.js`
**Method:** `routeCommentToAgent(content, metadata)`

**Current (WRONG):**
```javascript
routeCommentToAgent(content, metadata) {
  return 'avi'; // Always routes to Avi
}
```

**Correct Implementation:**
```javascript
routeCommentToAgent(content, metadata) {
  const parentPostId = metadata.parent_post_id;
  if (!parentPostId) return 'avi';

  const parentPost = this.db.prepare(`
    SELECT author_agent FROM agent_posts WHERE id = ?
  `).get(parentPostId);

  if (!parentPost || !parentPost.author_agent) return 'avi';

  return parentPost.author_agent; // Route to parent's agent
}
```

**Tests to Pass:** 5 tests in FR-1 suite

---

### Priority 2: Name Collection (FR-2.1)
**File:** `/api-server/worker/agent-worker.js` or `/api-server/services/onboarding/onboarding-flow-service.js`
**Method:** `processNameResponse(userId, name)`

**Current (WRONG):**
```javascript
processNameResponse(userId, name) {
  return { success: false, error: 'Not implemented yet' };
}
```

**Correct Implementation:**
```javascript
processNameResponse(userId, name) {
  // 1. Validate
  if (!name || name.trim().length === 0) {
    return { success: false, error: 'Empty name' };
  }
  if (name.length > 50) {
    return { success: false, error: 'Name too long' };
  }

  const trimmedName = name.trim();

  // 2. Save to user_settings
  this.db.prepare(`
    INSERT INTO user_settings (user_id, display_name)
    VALUES (?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      display_name = excluded.display_name,
      updated_at = unixepoch()
  `).run(userId, trimmedName);

  // 3. Update onboarding state
  const responses = { name: trimmedName };
  this.db.prepare(`
    UPDATE onboarding_state
    SET step = 'use_case',
        responses = ?,
        updated_at = unixepoch()
    WHERE user_id = ?
  `).run(JSON.stringify(responses), userId);

  // 4. Return response
  return {
    success: true,
    acknowledgment: `Nice to meet you, ${trimmedName}!`,
    nextStep: 'use_case',
    nextQuestion: `Great to meet you, ${trimmedName}! What brings you to Agent Feed?`
  };
}
```

**Tests to Pass:** 7 tests in FR-2 suite

---

### Priority 3: Use Case Collection (FR-2.2)
**Method:** `processUseCaseResponse(userId, useCase)`

**Current (WRONG):**
```javascript
processUseCaseResponse(userId, useCase) {
  return { success: false, error: 'Not implemented yet' };
}
```

**Correct Implementation:**
```javascript
processUseCaseResponse(userId, useCase) {
  // 1. Validate
  if (!useCase || useCase.trim().length === 0) {
    return { success: false, error: 'Empty use case' };
  }

  // 2. Get current state
  const state = this.getOnboardingState(userId);
  const responses = JSON.parse(state.responses || '{}');
  responses.use_case = useCase.trim();

  // 3. Mark Phase 1 complete
  this.db.prepare(`
    UPDATE onboarding_state
    SET phase1_completed = 1,
        phase1_completed_at = unixepoch(),
        step = 'phase1_complete',
        responses = ?,
        updated_at = unixepoch()
    WHERE user_id = ?
  `).run(JSON.stringify(responses), userId);

  // 4. Return trigger
  return {
    success: true,
    phase1Complete: true,
    triggerAviWelcome: true,
    userName: responses.name
  };
}
```

**Tests to Pass:** 3 tests in FR-2 suite

---

### Priority 4: Avi Welcome Post (FR-3)
**File:** `/api-server/services/onboarding/avi-welcome-generator.js` (NEW FILE)
**Method:** `createWelcomePost(userId, userName)`

**Current (WRONG):**
```javascript
createWelcomePost(userId, userName) {
  return { success: false, error: 'Not implemented yet' };
}
```

**Correct Implementation:**
```javascript
createWelcomePost(userId, userName) {
  // 1. Check for existing welcome
  const existing = this.db.prepare(`
    SELECT id FROM agent_posts
    WHERE author_agent = 'avi'
      AND author_id = ?
      AND json_extract(metadata, '$.type') = 'phase1_welcome'
  `).get(userId);

  if (existing) {
    return { success: false, error: 'Welcome already exists' };
  }

  // 2. Generate content
  const content = `Welcome, ${userName}! I'm Λvi, your AI Chief of Staff, and I'm excited to work with you. What can we tackle today?`;

  // 3. Validate tone (no technical jargon)
  const technicalTerms = ['code', 'debug', 'architecture', 'implementation'];
  const hasJargon = technicalTerms.some(term => content.toLowerCase().includes(term));
  if (hasJargon) {
    throw new Error('Welcome message contains technical jargon');
  }

  // 4. Create post
  const postId = `post-welcome-${Date.now()}`;
  this.db.prepare(`
    INSERT INTO agent_posts (id, title, content, author_agent, author_id, published_at, metadata)
    VALUES (?, ?, ?, ?, ?, unixepoch(), ?)
  `).run(
    postId,
    `Welcome, ${userName}!`,
    content,
    'avi',
    userId,
    JSON.stringify({ type: 'phase1_welcome', userName })
  );

  return { success: true, postId };
}
```

**Tests to Pass:** 5 tests in FR-3 suite

---

## Test Results You Want to See

### Target: All Green ✅

```bash
$ npx vitest run tests/unit/onboarding-comment-routing.test.js

 ✓ tests/unit/onboarding-comment-routing.test.js (30)
   ✓ FR-1: Comment Routing to Correct Agent (8)
     ✓ should route comment to get-to-know-you agent when parent post is by that agent
     ✓ should route comment to personal-todos agent when parent post is by that agent
     ✓ should default to Avi when parent post has no author_agent
     ✓ should default to Avi when parent post not found
     ✓ should default to Avi when no parent_post_id provided
     ✓ should route to correct agent for various agent types
     ✓ should preserve onboarding metadata when routing
     ✓ should handle explicit @mentions overriding routing
   ✓ FR-2: Get-to-Know-You Agent Response Logic (10)
     ✓ should create COMMENT acknowledging name
     ✓ should save display name to user_settings table
     ✓ should create NEW POST with conversational use case question
     ✓ should update onboarding_state to use_case step
     ✓ should validate name (1-50 chars, no special chars)
     ✓ should reject empty names
     ✓ should reject names longer than 50 chars
     ✓ should handle duplicate name responses gracefully
     ✓ should emit WebSocket events for each action
     ✓ should process use case and complete Phase 1
     ✓ should store both name and use_case in responses JSON
   ✓ FR-3: Avi Welcome Post Trigger (5)
     ✓ should detect Phase 1 completion
     ✓ should create separate NEW POST (not comment)
     ✓ should use warm, non-technical language
     ✓ should NOT mention code/debugging/architecture
     ✓ should only trigger once per user
   ✓ Edge Cases: Comment Routing and Onboarding (7)
   ✓ Integration: Full Onboarding Flow (1)

Test Files  1 passed (1)
     Tests  30 passed (30)
      Time  0.8s
```

---

## Database Schema Used

```sql
-- Posts table
CREATE TABLE agent_posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_agent TEXT,      -- ← KEY FIELD for routing
  author_id TEXT,
  published_at INTEGER NOT NULL,
  metadata TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Onboarding state table
CREATE TABLE onboarding_state (
  user_id TEXT PRIMARY KEY,
  phase INTEGER DEFAULT 1,
  step TEXT DEFAULT 'name',
  phase1_completed INTEGER DEFAULT 0,
  phase1_completed_at INTEGER,
  phase2_completed INTEGER DEFAULT 0,
  phase2_completed_at INTEGER,
  responses TEXT DEFAULT '{}',  -- ← JSON: { name, use_case, ... }
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- User settings table
CREATE TABLE user_settings (
  user_id TEXT PRIMARY KEY,
  display_name TEXT,      -- ← KEY FIELD saved from name collection
  preferences TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);
```

---

## Common Issues & Solutions

### Issue 1: Tests Still Failing After Implementation
**Symptom:** Tests fail with "Cannot read property 'author_agent' of undefined"
**Solution:** Ensure database connection passed to mock classes in tests

### Issue 2: Database Locked
**Symptom:** "database is locked" error
**Solution:** Close database connections properly in afterEach()

### Issue 3: JSON Parse Errors
**Symptom:** "Unexpected token in JSON"
**Solution:** Check onboarding_state.responses is valid JSON before parsing

### Issue 4: Display Name Not Appearing
**Symptom:** user_settings.display_name is NULL
**Solution:** Verify INSERT with ON CONFLICT clause executes correctly

---

## Test-Driven Development Cycle

```
1. RED PHASE (Current) ✅
   - Write failing tests
   - Tests document requirements
   - Verify tests fail for right reasons

2. GREEN PHASE (Next) 🟢
   - Implement minimal code to pass tests
   - Focus on functionality, not perfection
   - Run tests frequently

3. REFACTOR PHASE 🔄
   - Improve code quality
   - Add error handling
   - Optimize performance
   - Tests ensure no regression
```

---

## Files Modified in Implementation

```
1. /api-server/avi/orchestrator.js
   - Method: routeCommentToAgent()

2. /api-server/worker/agent-worker.js
   - Method: processComment()
   - Add onboarding detection

3. /api-server/services/onboarding/onboarding-flow-service.js
   - Method: processNameResponse()
   - Method: processUseCaseResponse()

4. /api-server/services/onboarding/avi-welcome-generator.js (NEW)
   - Method: createWelcomePost()
```

---

## Next Actions

1. ✅ RED phase complete (tests written and failing)
2. 🟢 **START GREEN phase:** Implement features to pass tests
3. 🔄 REFACTOR phase: Clean up and optimize
4. 📝 Update documentation with actual implementation
5. 🚀 Deploy to production

---

**Remember:** Tests are your safety net. Keep them green! 🟢
