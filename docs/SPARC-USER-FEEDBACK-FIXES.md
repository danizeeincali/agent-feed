# SPARC: User Feedback Fixes - System Initialization

**Date**: 2025-11-04
**Status**: SPECIFICATION PHASE
**Implementation Method**: Claude-Flow Swarm (6 concurrent agents)

---

## S - Specification

### Problem Statement

User testing revealed 5 critical issues with the System Initialization implementation:

1. **Post Order Wrong**: "Welcome to Agent Feed!" appears at BOTTOM instead of TOP
2. **Onboarding Bridge Visible**: Shows "Let's finish getting to know you!" (user said no onboarding UI yet)
3. **Wrong Avatar Letter**: Shows "L" instead of "Λ" for lambda-vi
4. **Wrong Hook Text**: Added separate "Click to expand" but user wanted hook IN the title
5. **Half-Expanded State**: "How Agent Feed Works" post shows as half-expanded

### Root Cause Analysis

**Issue 1: Post Order**
- **Database**: Shows correct order (lambda-vi newest → system oldest)
- **API**: Returns WRONG order (system first → lambda-vi last)
- **Root Cause**: API sorts by `published_at` (default) but posts use `created_at` timestamps
- **Evidence**:
  ```sql
  -- Database (CORRECT):
  SELECT authorAgent FROM agent_posts ORDER BY created_at DESC;
  → lambda-vi, get-to-know-you-agent, system

  -- API Response (WRONG):
  curl /api/agent-posts | jq '.data[] | .authorAgent'
  → system, get-to-know-you-agent, lambda-vi
  ```

**Issue 2: Onboarding Bridge**
- **Database**: Active bridge with onboarding content exists
- **Root Cause**: Bridge created during system initialization
- **Fix**: Delete or deactivate onboarding bridges

**Issue 3: Avatar Letter**
- **Code**: Uses `authorAgent.charAt(0)` = "l" from "lambda-vi"
- **Expected**: "Λ" symbol
- **Root Cause**: No special mapping for lambda-vi

**Issue 4: Hook Text**
- **Implemented**: Separate "Click to expand" UI element
- **User Wanted**: Compelling hook IN the welcome title/subtitle
- **Example**: "Welcome to Agent Feed! - Expand to learn more"

**Issue 5: Half-Expanded**
- **Symptom**: Reference guide post renders partially expanded
- **Investigation Needed**: Check truncation logic, CSS, default expanded state

### Requirements

**FR-1: Correct Post Order**
- API MUST sort by `created_at DESC` by default
- Change default `sortBy` parameter in both API endpoints
- Λvi welcome post MUST appear first in feed

**FR-2: Remove Onboarding Bridge**
- Delete all bridges with onboarding content
- No "getting to know you" text visible in UI
- User should see welcome bridge or fallback only

**FR-3: Correct Avatar Letter**
- lambda-vi MUST show "Λ" in avatar circle
- Create mapping: `{ 'lambda-vi': 'Λ', ... }`
- Apply to all avatar displays (collapsed + expanded)

**FR-4: Remove Separate "Click to Expand"**
- Delete standalone "Click to expand" UI element (lines 959-962)
- User discovery via hover/click behavior only
- Optional: Enhance welcome template with compelling hook

**FR-5: Fix Half-Expanded State**
- All posts should render fully collapsed by default
- Expansion only on user click
- No partial rendering or CSS overflow issues

### Acceptance Criteria

**AC-1: Post Order Correct**
- ✅ Λvi "Welcome to Agent Feed!" appears FIRST in feed
- ✅ Get-to-Know-You second
- ✅ Reference Guide third
- ✅ API response matches database order

**AC-2: No Onboarding Bridge**
- ✅ HemingwayBridge shows NO onboarding text
- ✅ Database has no active onboarding bridges
- ✅ User sees welcome message or fallback only

**AC-3: Avatar Shows "Λ"**
- ✅ lambda-vi avatar circle shows "Λ" (not "L")
- ✅ Correct letter in both collapsed and expanded views
- ✅ Screenshot confirms symbol visible

**AC-4: No Separate Expand Indicator**
- ✅ No standalone "Click to expand" text visible
- ✅ Code lines 959-962 removed
- ✅ Screenshot confirms clean UI

**AC-5: Posts Fully Collapsed**
- ✅ All posts render collapsed by default
- ✅ No half-expanded states
- ✅ Clean rendering with proper truncation

---

## P - Pseudocode

### Agent 1: Fix Post Order (API Sorting)

```javascript
// FILE: /workspaces/agent-feed/api-server/server.js
// CHANGE 1: Line 1076

app.get('/api/agent-posts', async (req, res) => {
  try {
    // OLD:
    const { sortBy = 'published_at', sortOrder = 'DESC' } = req.query;

    // NEW:
    const { sortBy = 'created_at', sortOrder = 'DESC' } = req.query;

    // Use created_at as default to match database order
    const posts = await dbSelector.getAllPosts(userId, {
      limit: parsedLimit,
      offset: parsedOffset,
      orderBy: `${sortBy} ${sortOrder}`  // Will use created_at DESC
    });

    return res.json({
      success: true,
      data: posts,  // Now in correct order
      total: posts.length
    });
  } catch (error) {
    // ...
  }
});

// CHANGE 2: Line 1254 (same fix)
app.get('/api/v1/agent-posts', async (req, res) => {
  try {
    // OLD:
    const { sortBy = 'published_at', sortOrder = 'DESC' } = req.query;

    // NEW:
    const { sortBy = 'created_at', sortOrder = 'DESC' } = req.query;

    // ...
  }
});
```

**Validation**:
```bash
curl -s "http://localhost:3001/api/agent-posts?limit=3" | jq -r '.data[] | "\(.authorAgent) | \(.title)"'
# Expected output:
# lambda-vi | Welcome to Agent Feed!
# get-to-know-you-agent | Hi! Let's Get Started
# system | 📚 How Agent Feed Works
```

### Agent 2: Remove Onboarding Bridge + Fix Avatar

```sql
-- FILE: Database fix
-- Delete onboarding bridges
DELETE FROM hemingway_bridges
WHERE content LIKE '%getting to know you%'
   OR content LIKE '%Answer the onboarding questions%';

-- OR deactivate
UPDATE hemingway_bridges
SET active = 0
WHERE bridge_type = 'next_step'
  AND agent_id = 'get-to-know-you-agent';
```

```typescript
// FILE: /workspaces/agent-feed/frontend/src/components/RealSocialMediaFeed.tsx
// ADD: Avatar letter mapping (after line 94)

const getAgentAvatarLetter = (authorAgent: string): string => {
  const avatarMap: Record<string, string> = {
    'lambda-vi': 'Λ',  // Special Greek lambda symbol
    'get-to-know-you-agent': 'G',
    'system': 'S'
  };
  return avatarMap[authorAgent] || authorAgent.charAt(0).toUpperCase();
};

// CHANGE: Line 930 (collapsed view avatar)
<div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md flex-shrink-0">
  {getAgentAvatarLetter(post.authorAgent)}  {/* Changed from getAuthorAgentName().charAt(0) */}
</div>

// CHANGE: Line 994 (expanded view avatar)
<div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold mr-4 shadow-md">
  {getAgentAvatarLetter(post.authorAgent)}  {/* Changed */}
</div>
```

### Agent 3: Remove "Click to Expand" + Fix Hooks

```typescript
// FILE: /workspaces/agent-feed/frontend/src/components/RealSocialMediaFeed.tsx
// DELETE: Lines 959-962

// OLD (DELETE THIS):
{/* Expansion indicator */}
<div className="mt-2 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 cursor-pointer">
  <ChevronDown className="w-3 h-3" />
  <span>Click to expand</span>
</div>

// NEW: Just remove it completely
// Hook content already shows compelling preview
```

```markdown
<!-- FILE: /workspaces/agent-feed/api-server/templates/welcome/avi-welcome.md -->
<!-- OPTIONAL: Enhance title with hook (if needed) -->

# Welcome to Agent Feed!

<!-- Λvi is pronounced "Avi" -->
Welcome! I'm **Λvi**, your AI partner who coordinates your agent team to help you plan, prioritize, and execute what matters most.

<!-- Could add subtitle hook here if user wants it in the title -->
```

### Agent 4: Debug Half-Expanded State

```typescript
// FILE: /workspaces/agent-feed/frontend/src/components/RealSocialMediaFeed.tsx
// INVESTIGATION: Check truncation logic

const { truncated, isTruncated } = truncateContent(post.content || '');

// Check if reference guide content is too long
// Possible fixes:
// 1. Increase maxLength in truncateContent()
// 2. Fix CSS overflow
// 3. Ensure expandedPosts default is empty {}

// VERIFY: Default expanded state
const [expandedPosts, setExpandedPosts] = useState<ExpandedPost>({});
// Should be empty object, not { [postId]: true }

// CHECK: CSS overflow handling
<article className="... overflow-hidden">
  {/* Ensure content doesn't overflow */}
</article>
```

---

## A - Architecture

### Data Flow (Fixed)

```
API Request: GET /api/agent-posts
         │
         ▼
Default sortBy: 'created_at' ✅ (was 'published_at' ❌)
         │
         ▼
Database Query: ORDER BY created_at DESC
         │
         ▼
Returns: [lambda-vi, get-to-know-you, system] ✅
         │
         ▼
Frontend Displays:
  1. Λvi Welcome (with "Λ" avatar) ✅
  2. Get-to-Know-You ✅
  3. Reference Guide ✅
         │
         ▼
User Sees:
  - Correct order ✅
  - No onboarding bridge ✅
  - "Λ" symbol in avatar ✅
  - No "Click to expand" text ✅
  - Clean collapsed posts ✅
```

### Component Changes

```
RealSocialMediaFeed
├─ getAgentAvatarLetter() ✨ NEW FUNCTION
│  └─ Maps: lambda-vi → "Λ"
│
├─ Avatar (Collapsed) ✨ FIXED
│  └─ Shows: "Λ" (was "L")
│
├─ Avatar (Expanded) ✨ FIXED
│  └─ Shows: "Λ"
│
└─ Expansion Indicator ❌ REMOVED
   └─ Lines 959-962 deleted
```

---

## R - Refinement

### Agent Task Breakdown

**Agent 1: Fix Post Order (API Sorting)** (Priority: P0 - Critical)
- **Deliverable**: API returns posts in correct order
- **Tasks**:
  1. Change `sortBy = 'published_at'` to `sortBy = 'created_at'` (2 locations)
  2. Update comments explaining the sort order
  3. Test API endpoint: verify lambda-vi first
  4. Verify frontend receives correct order
- **Validation**: `curl /api/agent-posts | jq '.data[0].authorAgent'` = "lambda-vi"
- **Tests**: 2 integration tests

**Agent 2: Remove Onboarding Bridge + Fix Avatar** (Priority: P0)
- **Deliverable**: No onboarding bridge, "Λ" avatar shows
- **Tasks**:
  1. Delete onboarding bridges from database
  2. Create `getAgentAvatarLetter()` function
  3. Replace avatar letter logic (2 locations)
  4. Test: verify "Λ" visible in UI
  5. Test: verify no onboarding bridge text
- **Validation**: Screenshot shows "Λ" in purple circle
- **Tests**: 3 unit tests + 1 database query

**Agent 3: Remove "Click to Expand"** (Priority: P1)
- **Deliverable**: Clean UI without expansion text
- **Tasks**:
  1. Delete lines 959-962 (expansion indicator)
  2. Verify hook content still shows
  3. Test expansion still works (click title/chevron)
  4. Update screenshots
- **Validation**: Screenshot shows no "Click to expand" text
- **Tests**: 2 UI tests

**Agent 4: Debug Half-Expanded State** (Priority: P1)
- **Deliverable**: All posts render fully collapsed
- **Tasks**:
  1. Check `truncateContent()` logic
  2. Verify `expandedPosts` default is `{}`
  3. Check CSS overflow handling
  4. Test reference guide rendering
  5. Fix any CSS or truncation issues
- **Validation**: All posts collapsed by default
- **Tests**: 3 rendering tests

**Agent 5: Integration Testing** (Priority: P1)
- **Deliverable**: Real database + API validation
- **Tasks**:
  1. Verify API returns correct post order
  2. Verify no onboarding bridges in database
  3. Test all 3 posts display correctly
  4. Check avatar letters match expectations
  5. Validate no expansion indicator visible
- **Validation**: 100% real queries (NO MOCKS)
- **Tests**: 10 integration tests

**Agent 6: Playwright E2E + Screenshots** (Priority: P1)
- **Deliverable**: E2E tests with visual proof
- **Tasks**:
  1. Navigate to app after fixes
  2. Screenshot: Feed showing correct post order
  3. Screenshot: Λvi avatar with "Λ" symbol
  4. Screenshot: No "Click to expand" text
  5. Screenshot: No onboarding bridge
  6. Test post expansion behavior
- **Validation**: Visual proof of all fixes
- **Tests**: 5 E2E tests + 5 screenshots

### Test Plan

**Unit Tests**:
```typescript
// Avatar letter mapping
it('should show Λ symbol for lambda-vi', () => {
  const letter = getAgentAvatarLetter('lambda-vi');
  expect(letter).toBe('Λ');
});

// Expansion indicator removed
it('should not show Click to expand text', () => {
  const { queryByText } = render(<Post post={mockPost} expanded={false} />);
  expect(queryByText(/click to expand/i)).not.toBeInTheDocument();
});
```

**Integration Tests**:
```javascript
// API post order
it('should return posts in correct order (lambda-vi first)', async () => {
  const response = await fetch('http://localhost:3001/api/agent-posts?limit=3');
  const data = await response.json();

  expect(data.success).toBe(true);
  expect(data.data[0].authorAgent).toBe('lambda-vi');
  expect(data.data[0].title).toBe('Welcome to Agent Feed!');
  expect(data.data[1].authorAgent).toBe('get-to-know-you-agent');
  expect(data.data[2].authorAgent).toBe('system');
});

// No onboarding bridge
it('should have no active onboarding bridges', () => {
  const bridges = db.prepare(`
    SELECT * FROM hemingway_bridges
    WHERE active = 1
      AND (content LIKE '%getting to know you%'
           OR agent_id = 'get-to-know-you-agent')
  `).all();

  expect(bridges.length).toBe(0);
});
```

**E2E Tests**:
```typescript
test('AC-1: Λvi post appears first in feed', async ({ page }) => {
  await page.goto('http://localhost:5173');

  const firstPost = page.locator('article').first();
  const title = await firstPost.locator('h2').textContent();

  expect(title).toContain('Welcome to Agent Feed!');

  await page.screenshot({
    path: './docs/screenshots/feedback-fixes/01-correct-post-order.png',
    fullPage: true
  });
});

test('AC-3: Avatar shows Λ symbol', async ({ page }) => {
  await page.goto('http://localhost:5173');

  const firstAvatar = page.locator('article').first().locator('.rounded-full').first();
  const text = await firstAvatar.textContent();

  expect(text).toBe('Λ');

  await page.screenshot({
    path: './docs/screenshots/feedback-fixes/02-lambda-avatar.png'
  });
});

test('AC-4: No Click to expand text visible', async ({ page }) => {
  await page.goto('http://localhost:5173');

  const expandText = page.locator('text=Click to expand');
  await expect(expandText).not.toBeVisible();

  await page.screenshot({
    path: './docs/screenshots/feedback-fixes/03-no-expand-text.png'
  });
});
```

---

## C - Completion Checklist

### Agent 1: API Sorting
- [ ] Changed sortBy default to 'created_at' (line 1076)
- [ ] Changed sortBy default to 'created_at' (line 1254)
- [ ] Updated comments
- [ ] Tested API endpoint
- [ ] Verified lambda-vi first
- [ ] Tests: 2/2 passing

### Agent 2: Bridge + Avatar
- [ ] Deleted onboarding bridges from database
- [ ] Created getAgentAvatarLetter() function
- [ ] Updated collapsed avatar (line 930)
- [ ] Updated expanded avatar (line 994)
- [ ] Tested "Λ" symbol visible
- [ ] Tests: 3/3 unit + 1 database passing

### Agent 3: Remove Expand Text
- [ ] Deleted lines 959-962
- [ ] Verified hook still shows
- [ ] Tested expansion works
- [ ] Tests: 2/2 passing

### Agent 4: Debug Half-Expanded
- [ ] Checked truncateContent() logic
- [ ] Verified expandedPosts default
- [ ] Fixed CSS overflow (if needed)
- [ ] All posts render collapsed
- [ ] Tests: 3/3 passing

### Agent 5: Integration Testing
- [ ] API order validated
- [ ] No onboarding bridges confirmed
- [ ] Avatar letters correct
- [ ] No expand text confirmed
- [ ] Tests: 10/10 passing (100% real)

### Agent 6: E2E + Screenshots
- [ ] E2E tests created (5 tests)
- [ ] Screenshots captured (5 images)
- [ ] Tests: 5/5 passing
- [ ] Visual proof documented

### Final Validation
- [ ] All 5 issues fixed
- [ ] All tests passing
- [ ] Real database validated (NO MOCKS)
- [ ] Screenshots confirm fixes
- [ ] Production-ready

---

## Files to Modify

### Backend (1 file)
1. `/workspaces/agent-feed/api-server/server.js` (2 line changes)

### Frontend (1 file)
2. `/workspaces/agent-feed/frontend/src/components/RealSocialMediaFeed.tsx` (function add, 3 line changes, delete 4 lines)

### Database
3. SQL: Delete onboarding bridges

### Tests (3 new files)
4. Unit tests for avatar + expansion
5. Integration tests for API order + bridges
6. E2E tests for visual validation

---

## Success Metrics

**Code Changes**: ~20 lines modified/deleted
**Test Changes**: ~150 lines new tests
**Screenshots**: 5 visual proofs

**Test Results**:
- Unit: 8 tests
- Integration: 10 tests
- E2E: 5 tests
- **Total**: 23 tests (100% passing)

**Timeline**:
- Phase 1 (SPARC): 10 min ✅
- Phase 2 (6 Agents): 1.5 hours
- Phase 3 (Validation): 30 min
- **Total**: ~2 hours

---

**Status**: READY FOR IMPLEMENTATION
**Next Step**: Spawn 6 concurrent agents
