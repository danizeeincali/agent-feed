# SPARC Specification: CommentThread Markdown Rendering Fix

**Date**: 2025-10-31
**Version**: 4.0.0 - COMPLETE FIX
**Status**: Implementation Ready
**Priority**: CRITICAL - User-Facing Bug

---

## 📋 SPECIFICATION Phase

### Problem Statement

**ROOT CAUSES IDENTIFIED**:
1. **CommentThread.tsx** renders `comment.content` as PLAIN TEXT using `renderMentions()`
2. **V1 API endpoint** (`/api/v1/agent-posts/:postId/comments`) does NOT include `content_type` logic
3. **createAgentComment()** does NOT send `content_type` to backend
4. **Database** has comments with markdown content but `content_type='text'`

**Evidence from Production**:
```sql
-- Weather post comment (created 2025-10-31 20:43):
id: 9e76b8c3-2029-4243-a811-8af801a43bcf
content: "...is **56°F with clear skies**..."  ← Has markdown syntax
content_type: text  ← Wrong type! Should be 'markdown'
```

**User Impact**:
- ❌ Users see raw `**symbols**` in ALL comments
- ❌ New comments created with wrong content_type
- ✅ Posts work (PostCard was fixed)
- ❌ Comments broken (CommentThread never fixed)

### Requirements

**FR-1: CommentThread Markdown Rendering**
- CommentThread MUST use `renderParsedContent()` instead of `renderMentions()`
- CommentThread MUST support all 11 markdown patterns
- CommentThread MUST preserve @mentions and #hashtags as interactive
- CommentThread MUST maintain existing styling and layout

**FR-2: V1 API Endpoint content_type**
- `/api/v1/agent-posts/:postId/comments` MUST extract `content_type` from request
- Endpoint MUST include `content_type` in commentData
- Endpoint MUST use smart defaults (markdown for agents, text for users)
- Maintain backward compatibility

**FR-3: Frontend API Client**
- `createAgentComment()` MUST detect markdown in content
- MUST send `content_type` parameter to backend
- Use same detection logic as `createComment()`

**FR-4: Database Migration**
- Update existing comments with markdown syntax to `content_type='markdown'`
- Only update where content actually has markdown patterns
- Preserve comments that are genuinely plain text

**NFR-1: Performance**
- No degradation in comment rendering speed
- Pattern detection < 1ms per comment
- Markdown rendering < 16ms (60fps)

**NFR-2: Testing**
- 100% real browser validation
- E2E tests with screenshots as evidence
- No mocks or simulations
- Regression: All existing tests must pass

---

## 🔧 PSEUDOCODE Phase

### Fix #1: CommentThread Markdown Rendering

```typescript
// File: frontend/src/components/CommentThread.tsx

// ADD IMPORTS (top of file)
import { renderParsedContent, parseContent } from '../utils/contentParser';

// REMOVE renderMentions function (lines 174-186)
const renderMentions = (content: string) => {
  // ❌ DELETE THIS ENTIRE FUNCTION
};

// REPLACE content rendering (line 273)
BEFORE:
  {renderMentions(comment.content)}

AFTER:
  {renderParsedContent(parseContent(comment.content), {
    enableMarkdown: true,
    onMentionClick: (agent: string) => {
      console.log('Mention clicked in comment:', agent);
      // Future: Navigate to agent profile
    },
    onHashtagClick: (tag: string) => {
      console.log('Hashtag clicked in comment:', tag);
      // Future: Filter by tag
    },
    className: 'comment-content prose prose-sm max-w-none',
    enableLinkPreviews: false  // Disable in comments to avoid clutter
  })}
```

### Fix #2: V1 API Endpoint

```javascript
// File: api-server/server.js line 1747

// UPDATE destructuring (line 1750)
BEFORE:
  const { content, author, author_agent, authorAgent, parent_id, mentioned_users } = req.body;

AFTER:
  const { content, author, author_agent, authorAgent, parent_id, mentioned_users, content_type } = req.body;

// UPDATE commentData (line 1772-1781)
BEFORE:
  const commentData = {
    id: uuidv4(),
    post_id: postId,
    content: content.trim(),
    author: author || authorValue.trim(),
    author_agent: authorValue.trim(),
    parent_id: parent_id || null,
    mentioned_users: mentioned_users || [],
    depth: 0
  };

AFTER:
  const commentData = {
    id: uuidv4(),
    post_id: postId,
    content: content.trim(),
    // ✅ Add smart content_type logic (same as main endpoint)
    content_type: content_type || (authorValue.trim() !== 'anonymous' && authorValue.trim() !== userId ? 'markdown' : 'text'),
    author: author || authorValue.trim(),
    author_agent: authorValue.trim(),
    parent_id: parent_id || null,
    mentioned_users: mentioned_users || [],
    depth: 0
  };
```

### Fix #3: Frontend API Client

```typescript
// File: frontend/src/services/api.ts

// ADD IMPORT (top of file)
import { hasMarkdown } from '../utils/contentParser';

// UPDATE createAgentComment (line 745-758)
BEFORE:
  async createAgentComment(postId: string, content: string, authorAgent: string): Promise<any> {
    this.clearCache('/v1/agent-posts');
    try {
      const response = await this.request<any>(`/v1/agent-posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content, authorAgent }),
      });
      return response;
    } catch (error) {
      console.error('Error creating agent comment:', error);
      throw error;
    }
  }

AFTER:
  async createAgentComment(postId: string, content: string, authorAgent: string): Promise<any> {
    this.clearCache('/v1/agent-posts');
    try {
      // ✅ Detect markdown in content
      const contentHasMarkdown = hasMarkdown(content.trim());

      const response = await this.request<any>(`/v1/agent-posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          content,
          authorAgent,
          content_type: contentHasMarkdown ? 'markdown' : 'text'  // ✅ Send content_type
        }),
      });

      console.log('[API] Agent comment created with content_type:', contentHasMarkdown ? 'markdown' : 'text');
      return response;
    } catch (error) {
      console.error('Error creating agent comment:', error);
      throw error;
    }
  }
```

### Fix #4: Database Migration

```sql
-- Find and fix comments with markdown syntax but wrong content_type
UPDATE comments
SET content_type = 'markdown'
WHERE content_type = 'text'
  AND (
    content LIKE '%**%**%'      -- Bold
    OR content LIKE '%*%*%'     -- Italic (strict check)
    OR content LIKE '%`%`%'     -- Inline code
    OR content LIKE '%```%'     -- Code blocks
    OR content LIKE '%##%'      -- Headers (## or ###)
    OR content LIKE '%- %'      -- Unordered lists
    OR content LIKE '%1. %'     -- Ordered lists
    OR content LIKE '%> %'      -- Blockquotes
    OR content LIKE '%[%](%'    -- Links
    OR content LIKE '%~~%~~%'   -- Strikethrough
  );

-- Verify changes
SELECT COUNT(*) as updated_count
FROM comments
WHERE content_type = 'markdown'
  AND updated_at > datetime('now', '-1 minute');
```

---

## 🏗️ ARCHITECTURE Phase

### Component Interaction Diagram

```
User Views Weather Post Comments
    ↓
┌─────────────────────────────────────────────────────┐
│ CommentThread.tsx                                   │
│ ┌─────────────────────────────────────────────────┐ │
│ │ comment.content → renderParsedContent()         │ │
│ │         ↓                                       │ │
│ │ parseContent(comment.content)                   │ │
│ │         ↓                                       │ │
│ │ hasMarkdown() → TRUE (detects **bold**)        │ │
│ │         ↓                                       │ │
│ │ MarkdownContent component renders:              │ │
│ │   - **56°F** as <strong>56°F</strong>          │ │
│ │   - @mentions as clickable                     │ │
│ │   - #hashtags as clickable                     │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
              ✅ User sees rendered markdown!
```

### Data Flow: New Comment Creation

```
Agent Creates Comment
    ↓
┌─────────────────────────────────────────────────────┐
│ Frontend: createAgentComment()                      │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 1. hasMarkdown(content) → TRUE                  │ │
│ │ 2. Set content_type = 'markdown'  ✅            │ │
│ │ 3. POST to /v1/agent-posts/:id/comments         │ │
│ │    Body: { content, authorAgent, content_type } │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────┐
│ Backend: /v1/agent-posts/:postId/comments           │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 1. Extract content_type from req.body  ✅       │ │
│ │ 2. Smart default: markdown for agents           │ │
│ │ 3. commentData.content_type = 'markdown'  ✅    │ │
│ │ 4. Save to database                             │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────┐
│ Database: comments table                            │
│ ┌─────────────────────────────────────────────────┐ │
│ │ content_type: 'markdown'  ✅ CORRECT            │ │
│ │ content: "**56°F with clear skies**"            │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
         ↓ WebSocket broadcast
┌─────────────────────────────────────────────────────┐
│ Frontend: CommentThread receives new comment        │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 1. renderParsedContent() detects markdown       │ │
│ │ 2. Renders as <strong>56°F</strong>  ✅         │ │
│ │ 3. User sees rendered markdown instantly!       │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## 🧪 REFINEMENT Phase - TDD Implementation

### Test Strategy

**Phase 1: Unit Tests for CommentThread**
```typescript
// File: frontend/src/components/__tests__/CommentThread.markdown.test.tsx

describe('CommentThread Markdown Rendering', () => {
  test('renders markdown in comment content', () => {
    const comment = {
      id: '1',
      content: '**Bold text** and *italic*',
      author: 'avi',
      created_at: new Date().toISOString()
    };

    const { container } = render(
      <CommentThread postId="test" comments={[comment]} onCommentsUpdate={() => {}} />
    );

    // Should render <strong> and <em> tags
    expect(container.querySelector('strong')).toBeTruthy();
    expect(container.querySelector('em')).toBeTruthy();

    // Should NOT show raw symbols
    expect(container.textContent).not.toContain('**');
  });

  test('renders mentions and hashtags in markdown content', () => {
    const comment = {
      id: '2',
      content: '**Update**: @alice check #bug-fix',
      author: 'avi',
      created_at: new Date().toISOString()
    };

    const { container } = render(
      <CommentThread postId="test" comments={[comment]} onCommentsUpdate={() => {}} />
    );

    // Should render markdown
    expect(container.querySelector('strong')).toBeTruthy();

    // Should render mentions/hashtags as interactive
    expect(container.textContent).toContain('@alice');
    expect(container.textContent).toContain('#bug-fix');
  });

  test('handles plain text comments without markdown', () => {
    const comment = {
      id: '3',
      content: 'This is plain text with no markdown',
      author: 'user',
      created_at: new Date().toISOString()
    };

    const { container } = render(
      <CommentThread postId="test" comments={[comment]} onCommentsUpdate={() => {}} />
    );

    // Should render text
    expect(container.textContent).toContain('This is plain text');

    // Should NOT have markdown elements
    expect(container.querySelector('strong')).toBeFalsy();
  });
});
```

**Phase 2: API Endpoint Tests**
```javascript
// File: api-server/tests/integration/v1-comments-content-type.test.js

describe('POST /api/v1/agent-posts/:postId/comments', () => {
  test('creates comment with explicit content_type', async () => {
    const response = await request(app)
      .post('/api/v1/agent-posts/test-post-1/comments')
      .send({
        content: '**Bold content**',
        authorAgent: 'avi',
        content_type: 'markdown'
      });

    expect(response.status).toBe(201);
    expect(response.body.data.content_type).toBe('markdown');
  });

  test('smart defaults: agent comment gets markdown', async () => {
    const response = await request(app)
      .post('/api/v1/agent-posts/test-post-1/comments')
      .send({
        content: '**Bold content**',
        authorAgent: 'avi'
        // No content_type sent
      });

    expect(response.status).toBe(201);
    expect(response.body.data.content_type).toBe('markdown');  // Smart default
  });

  test('smart defaults: user comment gets text', async () => {
    const response = await request(app)
      .post('/api/v1/agent-posts/test-post-1/comments')
      .send({
        content: 'Plain text',
        author: 'anonymous'
        // No content_type sent
      });

    expect(response.status).toBe(201);
    expect(response.body.data.content_type).toBe('text');  // Smart default
  });
});
```

**Phase 3: E2E Browser Tests**
```typescript
// File: frontend/tests/e2e/comment-markdown-rendering.spec.ts

test('weather post comments render markdown correctly', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // Find the weather post
  const weatherPost = page.locator('text=weather in los gatos').first();
  await weatherPost.click();

  // Open comments
  const commentButton = page.locator('button:has-text("Comment")').first();
  await commentButton.click();

  // Wait for comments to load
  await page.waitForTimeout(1000);

  // Find comment with markdown
  const commentWithMarkdown = page.locator('text=**56°F**').first();

  // Verify markdown is RENDERED (not raw)
  const commentContainer = commentWithMarkdown.locator('..');
  const strongElement = await commentContainer.locator('strong').count();
  expect(strongElement).toBeGreaterThan(0);

  // Verify NO raw symbols visible
  const pageText = await page.textContent('body');
  const visibleAsterisks = (pageText?.match(/\*\*/g) || []).length;
  expect(visibleAsterisks).toBe(0);  // No raw ** should be visible

  // Screenshot evidence
  await page.screenshot({ path: 'screenshots/comment-markdown-rendered.png' });
});

test('new comment with markdown renders immediately', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // Navigate to weather post
  await page.locator('text=weather in los gatos').first().click();

  // Open comment form
  await page.locator('button:has-text("Comment")').click();

  // Type markdown comment
  const textarea = page.locator('textarea');
  await textarea.fill('This is **bold** and *italic* text');

  // Submit
  await page.locator('button:has-text("Post")').click();

  // Wait for new comment to appear
  await page.waitForTimeout(1500);

  // Find the new comment
  const newComment = page.locator('text=This is').last();
  const commentContainer = newComment.locator('..');

  // Verify markdown rendered
  expect(await commentContainer.locator('strong').count()).toBeGreaterThan(0);
  expect(await commentContainer.locator('em').count()).toBeGreaterThan(0);

  // Screenshot
  await page.screenshot({ path: 'screenshots/new-comment-markdown.png' });
});
```

---

## ✅ COMPLETION Phase - Validation Criteria

### Definition of Done

**Code Changes**:
- ✅ CommentThread.tsx uses renderParsedContent()
- ✅ V1 API endpoint includes content_type logic
- ✅ createAgentComment() sends content_type
- ✅ Database migration updates existing comments

**Testing**:
- ✅ Unit tests: CommentThread markdown rendering (10+ tests)
- ✅ API tests: V1 endpoint content_type (5+ tests)
- ✅ E2E tests: Real browser validation (3+ tests)
- ✅ Regression: All existing tests still pass

**Browser Validation**:
- ✅ Weather post comments show rendered markdown
- ✅ No raw `**symbols**` visible anywhere
- ✅ New comments render markdown immediately
- ✅ @mentions and #hashtags clickable
- ✅ Database has correct content_type values
- ✅ No console errors

**Documentation**:
- ✅ Implementation report with screenshots
- ✅ Test results documented
- ✅ Database migration verified
- ✅ Before/after comparison

---

## 📊 Files to Modify

| File | Type | Lines | Changes |
|------|------|-------|---------|
| `frontend/src/components/CommentThread.tsx` | MODIFY | ~15 | Replace renderMentions with renderParsedContent |
| `api-server/server.js` | MODIFY | ~5 | Add content_type to V1 endpoint |
| `frontend/src/services/api.ts` | MODIFY | ~10 | Update createAgentComment |
| `frontend/src/components/__tests__/CommentThread.markdown.test.tsx` | NEW | ~200 | Unit tests |
| `api-server/tests/integration/v1-comments.test.js` | NEW | ~100 | API tests |
| `frontend/tests/e2e/comment-markdown.spec.ts` | NEW | ~150 | E2E tests |

**Total**: 3 files modified, 3 new test files, 1 database migration

---

**Status**: Ready for concurrent implementation
**Methodology**: SPARC + TDD + Claude-Flow Swarm
**Validation**: 100% real browser verification with screenshots
