# SPARC Specification: Username Display Fix - "Nerd" Not Showing

**Date**: 2025-11-02
**Status**: SPECIFICATION PHASE
**Methodology**: SPARC + TDD + Claude-Flow Swarm
**Validation**: Playwright MCP with Screenshots (100% Real, No Mocks)

---

## SPECIFICATION PHASE

### Problem Statement

**Current State**: User changed their display name to "Nerd" in the database, and the API confirmed the change was successful. However:
- Posts still show "by user-agent" instead of "by Nerd"
- Comments still show "User" instead of "Nerd"

**Root Cause**: Hardcoded user IDs in frontend code don't match the actual user_id in the database:
- Database has: `user_id = 'demo-user-123'` with `display_name = 'Nerd'`
- PostCreator.tsx hardcodes: `author_agent: 'user-agent'` ❌
- RealSocialMediaFeed.tsx hardcodes: `userId = 'anonymous'` ❌

**Desired State**:
- All posts show "by Nerd"
- All comments show "Nerd"
- Username displays consistently everywhere

---

### Functional Requirements

**FR-1: Fix PostCreator Hardcoded User ID**
- Change `author_agent: 'user-agent'` to `author_agent: 'demo-user-123'`
- All new posts must use correct user ID
- UserDisplayName component will fetch "Nerd" from API
- **Acceptance**: New posts show "by Nerd" in the feed

**FR-2: Fix RealSocialMediaFeed Hardcoded User ID**
- Change `const [userId] = useState('anonymous')` to `useState('demo-user-123')`
- All comments must use correct user ID
- UserDisplayName component will fetch "Nerd" from API
- **Acceptance**: Comments show "Nerd" as author

**FR-3: Support Legacy Posts/Comments**
- Create user_settings records for legacy IDs ('user-agent', 'anonymous')
- Old posts with 'user-agent' should also show "Nerd"
- Old comments with 'anonymous' should also show "Nerd"
- **Acceptance**: Historical posts/comments also display "Nerd"

**FR-4: Validate Database State**
- Verify user_settings has correct data:
  - user_id: 'demo-user-123' → display_name: 'Nerd' ✅
  - user_id: 'user-agent' → display_name: 'Nerd' (to be created)
  - user_id: 'anonymous' → display_name: 'Nerd' (to be created)
- **Acceptance**: All user IDs map to "Nerd"

---

### Non-Functional Requirements

**NFR-1: No Breaking Changes**
- Fix must not break existing functionality
- Other features (markdown, real-time comments, etc.) must continue working
- No impact on agent posts

**NFR-2: Real Browser Validation**
- All testing must use real browser (Playwright)
- Screenshots must document before/after state
- No mocks or simulations allowed
- Test against running application

**NFR-3: Performance**
- Changes must not impact load time
- UserDisplayName caching should work correctly
- API responses must remain <100ms

---

## PSEUDOCODE PHASE

### Agent Team Structure (4 Concurrent Agents)

```
Agent 1: Frontend User ID Fixer
  PROCEDURE FixFrontendUserIDs():
    1. Read PostCreator.tsx
    2. Find line with: author_agent: 'user-agent'
    3. Replace with: author_agent: 'demo-user-123'
    4. Read RealSocialMediaFeed.tsx
    5. Find line with: const [userId] = useState('anonymous')
    6. Replace with: const [userId] = useState('demo-user-123')
    7. Verify no other hardcoded 'anonymous' or 'user-agent' strings
    8. Save both files
    RETURN: Updated frontend files

Agent 2: Database Legacy ID Creator
  PROCEDURE CreateLegacyUserSettings():
    1. Connect to database
    2. Check if 'user-agent' user_settings exists
    3. If not, INSERT INTO user_settings:
       - user_id: 'user-agent'
       - display_name: 'Nerd'
       - onboarding_completed: 1
    4. Check if 'anonymous' user_settings exists
    5. If not, INSERT INTO user_settings:
       - user_id: 'anonymous'
       - display_name: 'Nerd'
       - onboarding_completed: 1
    6. Verify both records exist
    7. Query to confirm display_name = 'Nerd'
    RETURN: Database migration results

Agent 3: TDD Test Suite Creator
  PROCEDURE CreateUsernameDisplayTests():
    1. Create test file: username-display-fix.spec.ts
    2. Test 1: Verify PostCreator uses correct user ID
       - Create new post
       - Check API request has author_agent: 'demo-user-123'
    3. Test 2: Verify post displays "Nerd"
       - Navigate to feed
       - Find latest post
       - Assert author shows "Nerd"
    4. Test 3: Verify comment displays "Nerd"
       - Open post with comments
       - Check comment author shows "Nerd"
    5. Test 4: Verify legacy posts show "Nerd"
       - Find post with author_agent: 'user-agent'
       - Assert displays "Nerd"
    6. All tests must use REAL browser, REAL API
    RETURN: Comprehensive test suite

Agent 4: Browser Validation & Screenshots
  PROCEDURE ValidateBrowserAndScreenshot():
    WAIT FOR Agent 1, Agent 2 to complete

    1. Open browser with Playwright
    2. Navigate to app URL
    3. BEFORE screenshots (if possible):
       - Screenshot: before-posts.png (shows "user-agent")
       - Screenshot: before-comments.png (shows "User")

    4. Create new post with text "Testing Nerd username"
    5. Screenshot: after-new-post.png
    6. Verify post shows "by Nerd"

    7. Open post with comments
    8. Create test comment
    9. Screenshot: after-comment.png
    10. Verify comment shows "Nerd"

    11. Check old posts in feed
    12. Screenshot: legacy-posts.png
    13. Verify old posts also show "Nerd"

    14. Verify NO "user-agent" text visible
    15. Verify NO "User" text in comment authors
    16. Screenshot: final-state.png

    17. Create validation report with all screenshots
    RETURN: Validation report + 6 screenshots
```

---

## ARCHITECTURE PHASE

### Fix Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              BEFORE (Broken State)                          │
├─────────────────────────────────────────────────────────────┤
│  PostCreator.tsx                                            │
│  └─> author_agent: 'user-agent'                            │
│       └─> UserDisplayName('user-agent')                    │
│            └─> API: /api/user-settings/user-agent          │
│                 └─> 404 Not Found ❌                        │
│                      └─> Fallback: "user-agent"            │
│                                                             │
│  RealSocialMediaFeed.tsx                                    │
│  └─> userId: 'anonymous'                                    │
│       └─> UserDisplayName('anonymous')                     │
│            └─> API: /api/user-settings/anonymous           │
│                 └─> 404 Not Found ❌                        │
│                      └─> Fallback: "User"                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              AFTER (Fixed State)                            │
├─────────────────────────────────────────────────────────────┤
│  PostCreator.tsx                                            │
│  └─> author_agent: 'demo-user-123'                         │
│       └─> UserDisplayName('demo-user-123')                 │
│            └─> API: /api/user-settings/demo-user-123       │
│                 └─> 200 OK: {display_name: "Nerd"} ✅      │
│                      └─> Display: "Nerd"                   │
│                                                             │
│  RealSocialMediaFeed.tsx                                    │
│  └─> userId: 'demo-user-123'                               │
│       └─> UserDisplayName('demo-user-123')                 │
│            └─> API: /api/user-settings/demo-user-123       │
│                 └─> 200 OK: {display_name: "Nerd"} ✅      │
│                      └─> Display: "Nerd"                   │
│                                                             │
│  Legacy Support (Optional):                                 │
│  └─> Database: user_settings table                         │
│       ├─> user_id: 'user-agent' → display_name: 'Nerd'    │
│       └─> user_id: 'anonymous' → display_name: 'Nerd'     │
└─────────────────────────────────────────────────────────────┘
```

### Database Changes

```sql
-- Current state (already exists):
SELECT * FROM user_settings WHERE user_id = 'demo-user-123';
-- Result: user_id='demo-user-123', display_name='Nerd' ✅

-- New records to create (for legacy support):
INSERT INTO user_settings (user_id, display_name, onboarding_completed, created_at, updated_at)
VALUES
  ('user-agent', 'Nerd', 1, unixepoch(), unixepoch()),
  ('anonymous', 'Nerd', 1, unixepoch(), unixepoch());

-- Verification:
SELECT user_id, display_name FROM user_settings
WHERE user_id IN ('demo-user-123', 'user-agent', 'anonymous');

-- Expected result:
-- demo-user-123 | Nerd
-- user-agent    | Nerd
-- anonymous     | Nerd
```

---

## REFINEMENT PHASE (TDD)

### Test Plan

**Test 1: PostCreator Uses Correct User ID**
```typescript
test('PostCreator sends demo-user-123 as author_agent', async () => {
  const page = await browser.newPage();

  // Intercept POST request to /api/posts
  const requests = [];
  page.on('request', req => {
    if (req.url().includes('/api/posts') && req.method() === 'POST') {
      requests.push(req.postDataJSON());
    }
  });

  await page.goto(APP_URL);
  await page.fill('[data-testid="post-input"]', 'Test post');
  await page.click('[data-testid="submit-post"]');

  await page.waitForTimeout(1000);

  expect(requests.length).toBeGreaterThan(0);
  expect(requests[0].author_agent).toBe('demo-user-123');
});
```

**Test 2: New Post Displays "Nerd"**
```typescript
test('New post shows author as Nerd', async () => {
  const page = await browser.newPage();
  await page.goto(APP_URL);

  // Create post
  await page.fill('[data-testid="post-input"]', 'Testing Nerd display');
  await page.click('[data-testid="submit-post"]');

  // Wait for post to appear
  await page.waitForSelector('text="Testing Nerd display"');

  // Find author name near the post
  const authorElement = await page.locator('text="Testing Nerd display"')
    .locator('..')
    .locator('text=/by|from/i')
    .locator('..')
    .textContent();

  expect(authorElement).toContain('Nerd');
  expect(authorElement).not.toContain('user-agent');

  await page.screenshot({ path: 'test-results/new-post-shows-nerd.png' });
});
```

**Test 3: Comments Display "Nerd"**
```typescript
test('Comments show author as Nerd', async () => {
  const page = await browser.newPage();
  await page.goto(APP_URL);

  // Open first post
  await page.click('[data-testid="post-card"]:first-child');
  await page.click('[data-testid="comments-button"]');

  // Create comment
  await page.fill('[data-testid="comment-input"]', 'Test comment');
  await page.click('[data-testid="submit-comment"]');

  // Wait for comment to appear
  await page.waitForSelector('text="Test comment"');

  // Check author
  const commentAuthor = await page.locator('text="Test comment"')
    .locator('..')
    .locator('[class*="author"]')
    .textContent();

  expect(commentAuthor).toBe('Nerd');
  expect(commentAuthor).not.toBe('User');

  await page.screenshot({ path: 'test-results/comment-shows-nerd.png' });
});
```

**Test 4: Legacy Posts Show "Nerd"**
```typescript
test('Old posts with user-agent ID show Nerd after database update', async () => {
  const page = await browser.newPage();
  await page.goto(APP_URL);

  // Find posts with old data (if any exist)
  const posts = await page.locator('[data-testid="post-card"]').all();

  for (const post of posts) {
    const authorText = await post.locator('[class*="author"]').textContent();

    // Should NOT see "user-agent" or "anonymous"
    expect(authorText).not.toContain('user-agent');
    expect(authorText).not.toContain('anonymous');

    // Should see "Nerd" or agent names
    if (!authorText.includes('Λvi') && !authorText.includes('Agent')) {
      expect(authorText).toContain('Nerd');
    }
  }

  await page.screenshot({ path: 'test-results/legacy-posts-show-nerd.png' });
});
```

---

## COMPLETION PHASE

### Acceptance Criteria

**✅ Frontend Code**
- [ ] PostCreator.tsx line 268 changed to `author_agent: 'demo-user-123'`
- [ ] RealSocialMediaFeed.tsx line 138 changed to `userId: 'demo-user-123'`
- [ ] No other hardcoded 'user-agent' or 'anonymous' in user ID contexts
- [ ] Code compiles with no TypeScript errors

**✅ Database**
- [ ] user_settings has record for 'demo-user-123' with display_name 'Nerd'
- [ ] user_settings has record for 'user-agent' with display_name 'Nerd'
- [ ] user_settings has record for 'anonymous' with display_name 'Nerd'
- [ ] All 3 records verified in database

**✅ Browser Validation**
- [ ] New posts show "by Nerd"
- [ ] Comments show "Nerd" as author
- [ ] NO "user-agent" visible in UI
- [ ] NO "User" visible in comment authors (except for users who haven't set a name)
- [ ] Legacy posts also show "Nerd"

**✅ Testing**
- [ ] All TDD tests pass (4+ tests)
- [ ] Playwright tests executed in real browser
- [ ] 6+ screenshots captured as evidence
- [ ] No regressions in other features

**✅ Documentation**
- [ ] Validation report created with screenshots
- [ ] Before/after comparison documented
- [ ] All changes listed with file paths and line numbers

---

### Deliverables

1. **Updated Frontend Files**
   - PostCreator.tsx (1 line changed)
   - RealSocialMediaFeed.tsx (1 line changed)

2. **Database Updates**
   - 2 new user_settings records
   - SQL script for creating records

3. **Test Suite**
   - username-display-fix.spec.ts (4+ tests)
   - All tests passing

4. **Validation Report**
   - Screenshots (before/after)
   - Test execution results
   - Acceptance criteria checklist

5. **Updated Documentation**
   - PRODUCTION-READINESS-PLAN.md (if needed)

---

## Agent Coordination Protocol

### Execution Order

**Phase 1: Code Fixes (Parallel)**
- Agent 1: Fix frontend user IDs
- Agent 2: Create database records

**Phase 2: Testing (After Phase 1)**
- Agent 3: Create and run TDD tests

**Phase 3: Validation (After Phase 2)**
- Agent 4: Browser validation with screenshots

### Success Metrics

- **0 instances** of "user-agent" in post authors
- **0 instances** of "User" in comment authors (for the demo user)
- **100% test pass rate** for new tests
- **6+ screenshots** documenting fix
- **All browser validation criteria** met

---

**Status**: SPECIFICATION COMPLETE - READY FOR AGENT EXECUTION
**Next**: Spawn 4 concurrent agents via Claude Code Task tool
**Estimated Completion**: 15-30 minutes
