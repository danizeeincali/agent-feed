# SPARC: System Initialization UI/UX Fixes

**Date**: 2025-11-04
**Status**: SPECIFICATION PHASE
**Implementation Method**: Claude-Flow Swarm (6 concurrent agents)

---

## S - Specification

### Problem Statement

User feedback identified 7 critical UI/UX issues with the System Initialization flow:

1. **Post Order Reversed**: Posts appear in wrong order (System, Get-to-Know-You, Λvi) instead of (Λvi, Get-to-Know-You, System)
2. **"Lambda" Text**: Template contains `(Lambda-vi)` but user wants just "Λvi" pronounced "Avi"
3. **No Expansion Indicator**: Posts don't show "Click to expand" - users don't know they can expand
4. **Duplicate Title**: Title shows twice when expanded (header + markdown H1)
5. **"User" Display Name**: Expanded posts show "User" instead of agent name
6. **Mention Placeholders**: Content shows `___MENTION_2___` instead of clickable @mentions
7. **Bridge Error**: Console shows "Failed to fetch bridge" error

### Requirements

**FR-1: Post Order**
- First post: Λvi Welcome
- Second post: Get-to-Know-You Onboarding
- Third post: Reference Guide (How Agent Feed Works)
- Database query should return posts in this order (newest first)

**FR-2: Λvi Naming**
- Remove all "Lambda" text from templates
- Use only "Λvi" (no pronunciation guide in visible text)
- Code comments can explain pronunciation

**FR-3: Expansion UI**
- Add visible "Click to expand" or "Read more" text
- Make expansion discoverable without hovering
- Show visual indicator near collapsed content

**FR-4: Single Title Display**
- Expanded view should show title only once
- Either remove header title OR strip H1 from markdown content

**FR-5: Agent Display Names**
- Show agent's actual name (lambda-vi, get-to-know-you-agent, system)
- OR show friendly name (Λvi, Get-to-Know-You, System Guide)
- Never show generic "User" fallback

**FR-6: Mention Rendering**
- @ mentions should render as clickable blue buttons
- No placeholder text like `___MENTION_2___` visible to user
- Clicking mention should filter feed to that agent

**FR-7: Bridge API**
- HemingwayBridge should load without errors
- If no bridge exists, show graceful fallback
- No console errors

### Acceptance Criteria

**AC-1: Post Order Correct**
- ✅ Database query: `SELECT * FROM agent_posts ORDER BY created_at DESC` returns Λvi first
- ✅ Frontend displays Λvi welcome at top of feed
- ✅ Get-to-Know-You second
- ✅ Reference Guide third

**AC-2: No "Lambda" Text**
- ✅ Λvi welcome post content contains "Λvi" but NOT "Lambda-vi"
- ✅ Database grep shows no "Lambda" in welcome posts
- ✅ Browser shows only "Λvi" (pronounced "Avi")

**AC-3: Expansion Discoverable**
- ✅ Collapsed posts show visible "Click to expand" or chevron with text
- ✅ User can identify expandable posts without guessing
- ✅ Screenshot shows expansion indicator

**AC-4: Title Shown Once**
- ✅ Expanded post shows title in ONE location only
- ✅ No duplicate heading visible
- ✅ Screenshot confirms single title

**AC-5: Agent Names Correct**
- ✅ Expanded posts show agent name (not "User")
- ✅ Database has correct authorAgent values
- ✅ Screenshot shows "Λvi" or "lambda-vi" (not "User")

**AC-6: Mentions Clickable**
- ✅ Reference guide post shows clickable @agent-name mentions
- ✅ No `___MENTION_X___` text visible
- ✅ Clicking mention filters feed
- ✅ Screenshot shows blue clickable mentions

**AC-7: No Bridge Errors**
- ✅ HemingwayBridge loads without errors
- ✅ Console shows no "Failed to fetch bridge" errors
- ✅ Bridge displays content OR graceful message

---

## P - Pseudocode

### Agent 1: Backend Post Order + Lambda Fixes

```javascript
// FILE: api-server/services/system-initialization/welcome-content-service.js
// CHANGE: Line 123-127

export function createAllWelcomePosts(userId, displayName = null) {
  // OLD ORDER (WRONG):
  // return [
  //   generateAviWelcome(userId, displayName),      // 1st
  //   generateOnboardingPost(userId),               // 2nd
  //   generateReferenceGuide()                      // 3rd
  // ];

  // NEW ORDER (CORRECT - reverse for DESC created_at):
  // When inserted with timestamps, newest = top of feed
  // We want: Λvi → Onboarding → Reference
  // So insert in reverse order (Reference → Onboarding → Λvi)
  return [
    generateReferenceGuide(),                       // Oldest timestamp
    generateOnboardingPost(userId),                 // Middle timestamp
    generateAviWelcome(userId, displayName)         // Newest timestamp (shows first)
  ];
}
```

```markdown
<!-- FILE: api-server/templates/welcome/avi-welcome.md -->
<!-- CHANGE: Line 3 -->

# Welcome to Agent Feed!

<!-- OLD: Welcome! I'm **Λvi** (Lambda-vi), your AI partner... -->
<!-- NEW: -->
Welcome! I'm **Λvi** (pronounced "Avi"), your AI partner who coordinates your agent team...

<!-- OR simpler: -->
Welcome! I'm **Λvi**, your AI partner who coordinates your agent team...
```

### Agent 2: Frontend Expansion UI

```typescript
// FILE: frontend/src/components/RealSocialMediaFeed.tsx
// CHANGE: Line 912-931 (collapsed view)

// Add expansion indicator after hook content
<div className="pl-14">
  <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
    {renderParsedContent(parseContent(getHookContent(post.content)), { ... })}
  </div>

  {/* NEW: Expansion indicator */}
  <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
    <ChevronDown className="w-3 h-3" />
    <span>Click to expand</span>
  </div>
</div>
```

```typescript
// FILE: frontend/src/components/RealSocialMediaFeed.tsx
// CHANGE: Line 1020 (remove duplicate title in expanded view)

// Expanded View
<>
  {/* Post Header */}
  <div className="flex items-center justify-between mb-4">
    {/* Agent avatar and name - NO TITLE */}
  </div>

  {/* REMOVE THIS LINE - title is in markdown content */}
  {/* <h2 className="text-2xl font-bold ...>{post.title}</h2> */}

  {/* Post Content with title in markdown H1 */}
  <div className="prose prose-sm max-w-none mb-4">
    {renderParsedContent(parseContent(post.content), { ... })}
  </div>
</>
```

### Agent 3: User Display Names + Mentions

```typescript
// FILE: frontend/src/components/RealSocialMediaFeed.tsx
// CHANGE: Line 997 (fix User display)

// OLD: Shows "User" fallback
<h3>
  <UserDisplayName userId={post.authorAgent} fallback="Agent" />
</h3>

// NEW: Show agent name directly or map to display name
const getAgentDisplayName = (authorAgent: string): string => {
  const displayNames: Record<string, string> = {
    'lambda-vi': 'Λvi',
    'get-to-know-you-agent': 'Get-to-Know-You',
    'system': 'System Guide'
  };
  return displayNames[authorAgent] || authorAgent;
};

<h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
  {getAgentDisplayName(post.authorAgent)}
</h3>
```

```typescript
// FILE: frontend/src/components/MarkdownContent.tsx
// FIX: Placeholder restoration (___MENTION_2___ issue)

// Debug: Check if renderToken is being called
const renderToken = useCallback((token: SpecialToken) => {
  console.log('🔍 Rendering token:', token); // ADD THIS

  switch (token.type) {
    case 'mention':
      return (
        <button onClick={() => onMentionClick?.(token.data.agent!)}>
          {token.originalContent}
        </button>
      );
    // ... other cases
  }
}, [onMentionClick, onHashtagClick]);

// Ensure text nodes get token replacement
const customComponents: Components = {
  p: ({ children }) => {
    // Process text nodes to replace placeholders
    const processedChildren = React.Children.map(children, child => {
      if (typeof child === 'string') {
        return replaceTokensInText(child, extraction.tokenMap, renderToken);
      }
      return child;
    });
    return <p className="mb-3">{processedChildren}</p>;
  }
};
```

### Agent 4: Bridge Error Fix

```javascript
// FILE: api-server/routes/bridges.js
// CHECK: Ensure route is registered in server.js

// FILE: api-server/server.js
// ADD: Initialize bridge routes
import { initializeBridgeRoutes } from './routes/bridges.js';

// After database initialization
initializeBridgeRoutes(db);
app.use('/api/bridges', bridgesRouter);
```

```typescript
// FILE: frontend/src/components/HemingwayBridge.tsx
// CHANGE: Line 117 (graceful error handling)

const fetchActiveBridge = useCallback(async () => {
  try {
    const response = await fetch(`/api/bridges/active/${userId}`);

    if (!response.ok) {
      // Don't throw error - show fallback bridge instead
      console.warn('No active bridge found, using fallback');
      setBridge({
        id: 'fallback-bridge',
        bridge_type: 'question',
        content: 'Welcome! What brings you to Agent Feed today?',
        priority: 5,
        // ... other required fields
      });
      return;
    }

    const data = await response.json();
    if (data.success && data.bridge) {
      setBridge(data.bridge);
    }
  } catch (err) {
    console.error('Bridge error:', err);
    // Use fallback instead of showing error
    setBridge({ /* fallback bridge */ });
  } finally {
    setLoading(false);
  }
}, [userId]);
```

---

## A - Architecture

### Data Flow (Fixed)

```
System Initialization
         │
         ▼
Create 3 Posts (in reverse order for DESC sort)
         │
         ├─→ Post 3: Reference Guide (oldest timestamp)
         ├─→ Post 2: Onboarding (middle timestamp)
         └─→ Post 1: Λvi Welcome (newest timestamp)
         │
         ▼
Database Query: ORDER BY created_at DESC
         │
         ▼
Feed Display:
  1. Λvi Welcome (newest) ✅
  2. Get-to-Know-You (middle) ✅
  3. Reference Guide (oldest) ✅
         │
         ▼
User Sees:
  - Λvi welcome first (with expand indicator)
  - Clickable @mentions (no placeholders)
  - Single title when expanded
  - Correct agent names
  - No bridge errors
```

### Component Architecture

```
RealSocialMediaFeed
├─ Post (Collapsed)
│  ├─ Avatar + Title
│  ├─ Hook Content (parsed with mentions)
│  └─ "Click to expand" indicator ✨ NEW
│
├─ Post (Expanded)
│  ├─ Avatar + Agent Name (not "User") ✨ FIXED
│  ├─ Content with markdown + mentions ✨ FIXED
│  └─ NO duplicate title ✨ FIXED
│
└─ HemingwayBridge
   ├─ Fetch from API
   └─ Fallback if error ✨ FIXED
```

---

## R - Refinement

### Agent Task Breakdown

**Agent 1: Backend Post Order + Lambda Text** (Priority: P0)
- **Deliverable**: Fixed post order + cleaned templates
- **Tasks**:
  1. Reverse post order in `createAllWelcomePosts()`
  2. Remove "Lambda-vi" from `avi-welcome.md`
  3. Update tests to expect new order
  4. Delete old posts and reinitialize
  5. Verify database has correct order
  6. Grep database for "Lambda" - should find none
- **Validation**: Query database, check post order
- **Tests**: 5 unit + 3 integration

**Agent 2: Frontend Expansion UI + Duplicate Title** (Priority: P0)
- **Deliverable**: Expansion indicator + single title display
- **Tasks**:
  1. Add "Click to expand" text to collapsed view
  2. Remove duplicate title from expanded view
  3. Update CSS for better expansion UX
  4. Add unit tests for expansion behavior
  5. Visual regression tests
- **Validation**: Screenshot shows indicator and single title
- **Tests**: 4 unit + 2 visual

**Agent 3: User Display Names + Mention Placeholders** (Priority: P0)
- **Deliverable**: Correct agent names + clickable mentions
- **Tasks**:
  1. Create agent display name mapping
  2. Replace UserDisplayName with direct mapping
  3. Debug MarkdownContent token replacement
  4. Fix text node processing in custom components
  5. Test mention click behavior
  6. Ensure no `___MENTION___` placeholders visible
- **Validation**: Screenshot shows "Λvi" and clickable @mentions
- **Tests**: 6 unit + 3 integration

**Agent 4: Bridge Error Investigation + Fix** (Priority: P1)
- **Deliverable**: No bridge errors, graceful fallback
- **Tasks**:
  1. Check if bridge routes initialized in server.js
  2. Test `/api/bridges/active/:userId` endpoint
  3. Add fallback bridge if none exists
  4. Update HemingwayBridge error handling
  5. Add integration tests for bridge API
- **Validation**: Console shows no errors
- **Tests**: 4 integration + 2 API

**Agent 5: Integration Testing** (Priority: P1)
- **Deliverable**: Real database validation, no mocks
- **Tasks**:
  1. Delete all posts: `DELETE FROM agent_posts`
  2. Trigger initialization: `POST /api/system/initialize`
  3. Query database: verify 3 posts in correct order
  4. Verify Λvi first, no "Lambda" text
  5. Test all API endpoints
  6. Check mention rendering in browser
  7. Verify no errors in console
- **Validation**: 100% real database queries
- **Tests**: 15 integration tests

**Agent 6: Playwright E2E + Screenshots** (Priority: P1)
- **Deliverable**: E2E tests with screenshots
- **Tasks**:
  1. Navigate to app after fresh initialization
  2. Screenshot: Feed with 3 posts (Λvi first)
  3. Screenshot: Collapsed post with "Click to expand"
  4. Screenshot: Expanded post (single title, agent name, clickable mentions)
  5. Screenshot: No bridge errors
  6. Test expansion click behavior
  7. Test mention click behavior
  8. Capture video of full flow
- **Validation**: Visual proof of all fixes
- **Tests**: 8 E2E tests + 6 screenshots

### Test Plan

**Unit Tests** (Agent 1-3):
```javascript
// Agent 1: Post order
it('should create welcome posts in correct order', () => {
  const posts = createAllWelcomePosts('demo-user-123');
  expect(posts[0].agentId).toBe('system'); // Reference (oldest)
  expect(posts[1].agentId).toBe('get-to-know-you-agent'); // Middle
  expect(posts[2].agentId).toBe('lambda-vi'); // Λvi (newest)
});

it('should not contain "Lambda" in Λvi welcome', () => {
  const aviPost = generateAviWelcome('demo-user-123');
  expect(aviPost.content.toLowerCase()).not.toContain('lambda');
  expect(aviPost.content).toContain('Λvi');
});

// Agent 2: Expansion UI
it('should show expansion indicator in collapsed view', () => {
  const { getByText } = render(<Post post={mockPost} expanded={false} />);
  expect(getByText(/click to expand/i)).toBeInTheDocument();
});

it('should show title only once when expanded', () => {
  const { getAllByText } = render(<Post post={mockPost} expanded={true} />);
  const titleElements = getAllByText(mockPost.title);
  expect(titleElements.length).toBe(1);
});

// Agent 3: Display names + mentions
it('should show agent display name, not "User"', () => {
  const { getByText } = render(<Post post={lambdaViPost} expanded={true} />);
  expect(getByText('Λvi')).toBeInTheDocument();
  expect(queryByText('User')).not.toBeInTheDocument();
});

it('should render mentions as clickable buttons', () => {
  const content = 'Check @personal-todos-agent for tasks';
  const { getByTestId } = render(<MarkdownContent content={content} />);
  const mention = getByTestId('mention-personal-todos-agent');
  expect(mention.tagName).toBe('BUTTON');
  expect(mention).not.toContain('___MENTION');
});
```

**Integration Tests** (Agent 5):
```javascript
// Real database validation
it('should have posts in correct order after initialization', async () => {
  // Delete old posts
  db.prepare('DELETE FROM agent_posts').run();

  // Initialize
  const response = await fetch('/api/system/initialize', {
    method: 'POST',
    body: JSON.stringify({ userId: 'demo-user-123' })
  });

  expect(response.ok).toBe(true);

  // Query database
  const posts = db.prepare(`
    SELECT id, authorAgent, title, content
    FROM agent_posts
    ORDER BY created_at DESC
  `).all();

  expect(posts.length).toBe(3);
  expect(posts[0].authorAgent).toBe('lambda-vi');
  expect(posts[1].authorAgent).toBe('get-to-know-you-agent');
  expect(posts[2].authorAgent).toBe('system');

  // Verify no "Lambda" text
  expect(posts[0].content).not.toContain('Lambda-vi');
  expect(posts[0].content).toContain('Λvi');
});

it('should render mentions correctly in reference guide', async () => {
  const posts = db.prepare(`
    SELECT content FROM agent_posts
    WHERE authorAgent = 'system'
  `).all();

  const referenceGuide = posts[0];
  expect(referenceGuide.content).toContain('@personal-todos-agent');

  // Load in browser
  await page.goto('http://localhost:5173');
  await page.waitForSelector('[data-testid="mention-personal-todos-agent"]');

  const mention = await page.$('[data-testid="mention-personal-todos-agent"]');
  expect(mention).toBeTruthy();

  const text = await mention.textContent();
  expect(text).toBe('@personal-todos-agent');
  expect(text).not.toContain('___MENTION');
});
```

**E2E Tests** (Agent 6):
```typescript
test('AC-1: Feed shows posts in correct order', async ({ page }) => {
  await page.goto('http://localhost:5173');

  const posts = await page.locator('article').all();
  expect(posts.length).toBeGreaterThanOrEqual(3);

  const firstPostTitle = await posts[0].locator('h2').textContent();
  expect(firstPostTitle).toContain('Welcome to Agent Feed');

  await page.screenshot({
    path: './docs/screenshots/01-correct-post-order.png',
    fullPage: true
  });
});

test('AC-3: Posts show expansion indicator', async ({ page }) => {
  await page.goto('http://localhost:5173');

  const expandIndicator = await page.locator('text=Click to expand').first();
  expect(await expandIndicator.isVisible()).toBe(true);

  await page.screenshot({
    path: './docs/screenshots/02-expansion-indicator.png'
  });
});

test('AC-4: Expanded post shows title once', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // Expand first post
  const expandButton = await page.locator('[aria-label="Expand post"]').first();
  await expandButton.click();

  // Count title occurrences
  const titleElements = await page.locator('text=Welcome to Agent Feed!').all();
  expect(titleElements.length).toBe(1);

  await page.screenshot({
    path: './docs/screenshots/03-single-title-expanded.png'
  });
});

test('AC-6: Mentions render as clickable buttons', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // Expand reference guide post
  const posts = await page.locator('article').all();
  await posts[2].locator('[aria-label="Expand post"]').click();

  // Find mention
  const mention = await page.locator('[data-testid="mention-personal-todos-agent"]');
  expect(await mention.isVisible()).toBe(true);

  const text = await mention.textContent();
  expect(text).toBe('@personal-todos-agent');
  expect(text).not.toContain('___MENTION');

  await page.screenshot({
    path: './docs/screenshots/04-clickable-mentions.png'
  });

  // Click mention
  await mention.click();

  // Verify filter applied
  await page.waitForTimeout(1000);
  const filteredPosts = await page.locator('article').all();
  expect(filteredPosts.length).toBeGreaterThan(0);

  await page.screenshot({
    path: './docs/screenshots/05-mention-filter-applied.png'
  });
});
```

---

## C - Completion Checklist

### Pre-Implementation
- [x] SPARC specification approved
- [ ] Agent task breakdown reviewed
- [ ] Test plan documented

### Agent 1: Backend Fixes
- [ ] Post order reversed in createAllWelcomePosts()
- [ ] "Lambda-vi" removed from avi-welcome.md
- [ ] Database cleaned (DELETE FROM agent_posts)
- [ ] System reinitialized
- [ ] Database query confirms Λvi first
- [ ] Grep confirms no "Lambda" text
- [ ] Tests: 5 unit + 3 integration passing

### Agent 2: Frontend Expansion UI
- [ ] "Click to expand" indicator added
- [ ] Duplicate title removed from expanded view
- [ ] CSS updates for better UX
- [ ] Tests: 4 unit + 2 visual passing
- [ ] Screenshot shows expansion indicator

### Agent 3: Display Names + Mentions
- [ ] Agent display name mapping created
- [ ] "User" fallback replaced with agent names
- [ ] ___MENTION___ placeholders fixed
- [ ] Mentions render as clickable buttons
- [ ] Tests: 6 unit + 3 integration passing
- [ ] Screenshot shows "Λvi" and clickable mentions

### Agent 4: Bridge Error Fix
- [ ] Bridge routes initialized in server.js
- [ ] API endpoint /api/bridges/active/:userId working
- [ ] Fallback bridge implemented
- [ ] No console errors
- [ ] Tests: 4 integration + 2 API passing

### Agent 5: Integration Testing
- [ ] All integration tests passing (15/15)
- [ ] Real database validation (NO MOCKS)
- [ ] API endpoints validated
- [ ] Console shows no errors

### Agent 6: Playwright E2E
- [ ] All E2E tests passing (8/8)
- [ ] Screenshots captured (6 images)
- [ ] Video recorded of full flow
- [ ] Visual regression tests passing

### Final Validation
- [ ] All 7 issues fixed
- [ ] 100% test pass rate
- [ ] No mocks - all real validation
- [ ] Production-ready

---

## Success Metrics

**Code Changes**: ~150 lines modified
**Test Changes**: ~200 lines (unit + integration + E2E)
**New Tests**: ~300 lines

**Test Results**:
- Unit tests: 19 tests
- Integration tests: 15 tests
- E2E tests: 8 tests
- **Total**: 42 tests (100% passing)

**Timeline**:
- Phase 1 (SPARC): 15 min ✅
- Phase 2 (6 Agents): 2 hours
- Phase 3 (Validation): 45 min
- **Total**: ~3 hours

---

**Status**: READY FOR IMPLEMENTATION
**Next Step**: Spawn 6 concurrent agents using Claude-Flow Swarm
