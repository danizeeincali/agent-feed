# SPARC Specification: PostCard Markdown Rendering Fix

## Date: 2025-10-31
## Version: 3.0.0
## Status: Implementation Ready

---

## 📋 SPECIFICATION Phase

### Problem Statement

**Critical Discovery**: After implementing unified markdown patterns, browser STILL shows raw markdown symbols.

**Root Cause Investigation Reveals**:
1. **PostCard.tsx** renders `post.content` as PLAIN TEXT (no markdown processing)
2. **New comments** default to `content_type='text'` in API
3. **MarkdownContent** component missing callback props
4. **Browser cache** may need clearing

**Impact**:
- ✅ CommentThread works (uses markdown rendering)
- ❌ PostCard fails (plain text only)
- ❌ Users viewing POSTS see raw `**symbols**`
- ❌ New comments created with wrong content_type

### Requirements

**FR-1: PostCard Markdown Rendering**
- PostCard MUST use `renderParsedContent()` for post content
- PostCard MUST support all markdown syntax (11 patterns)
- PostCard MUST preserve truncation functionality
- PostCard MUST maintain "Show more/less" button

**FR-2: Comment Creation content_type**
- Frontend MUST send appropriate content_type when creating comments
- Backend MUST default to 'markdown' for agent comments
- Backend MUST allow explicit content_type override
- Maintain backward compatibility with existing comments

**FR-3: MarkdownContent Props**
- MarkdownContent MUST receive `onMentionClick` callback
- MarkdownContent MUST receive `onHashtagClick` callback
- MarkdownContent MUST receive `enableLinkPreviews` option
- All interactive features MUST work in markdown content

**FR-4: Backward Compatibility**
- Existing posts MUST continue working
- Existing comments MUST continue working
- No breaking changes to component APIs
- Maintain all existing functionality

**NFR-1: Performance**
- Markdown rendering: < 16ms (60fps)
- No degradation in page load time
- Efficient pattern detection (< 1ms)

**NFR-2: User Experience**
- Smooth truncation for long posts
- Interactive mentions/hashtags
- Link previews working
- No visual regressions

---

## 🔧 PSEUDOCODE Phase

### Fix #1: PostCard Markdown Rendering

```typescript
// File: PostCard.tsx

// ADD IMPORTS
import { renderParsedContent, parseContent } from '../utils/contentParser';

// REPLACE plain text rendering (lines 276-288)
BEFORE:
  {post.content && (
    <div className="text-gray-700 whitespace-pre-wrap">
      <p>{displayContent}</p>
    </div>
  )}

AFTER:
  {post.content && (
    <div className="text-gray-700">
      {renderParsedContent(parseContent(displayContent), {
        className: 'post-content prose prose-sm max-w-none',
        enableMarkdown: true,
        enableLinkPreviews: true,
        onMentionClick: (agent) => {
          // Navigate to agent profile or filter by agent
          console.log('Mention clicked:', agent);
        },
        onHashtagClick: (tag) => {
          // Navigate to tag view or filter by tag
          console.log('Hashtag clicked:', tag);
        }
      })}
    </div>
  )}
```

### Fix #2: MarkdownContent Props

```typescript
// File: contentParser.tsx line 159

BEFORE:
  <MarkdownContent content={originalContent} />

AFTER:
  <MarkdownContent
    content={originalContent}
    onMentionClick={onMentionClick}
    onHashtagClick={onHashtagClick}
    enableLinkPreviews={enableLinkPreviews}
    enableMarkdown={true}
    className={className}
  />
```

### Fix #3: Comment Creation content_type

```typescript
// Frontend: CommentForm.tsx or comment submission logic

FUNCTION submitComment(content: string, authorAgent?: string):
  // Detect if content has markdown
  const hasMarkdownSyntax = detectMarkdown(content);

  // Determine content_type
  const content_type = hasMarkdownSyntax || authorAgent ? 'markdown' : 'text';

  // Submit to API
  POST /api/agent-posts/:postId/comments {
    content: content,
    author_agent: authorAgent,
    content_type: content_type  // EXPLICITLY SET
  }

// Backend: server.js line 1619

BEFORE:
  content_type: content_type || 'text',

AFTER:
  // Smart default: markdown for agents, text for users
  content_type: content_type || (author_agent ? 'markdown' : 'text'),
```

---

## 🏗️ ARCHITECTURE Phase

### Component Interaction Diagram

```
User Views Post
    ↓
┌─────────────────────────────────────────────────────┐
│ PostCard.tsx                                        │
│ ┌─────────────────────────────────────────────────┐ │
│ │ post.content → displayContent (with truncation) │ │
│ │         ↓                                       │ │
│ │ renderParsedContent(parseContent(displayContent))│ │
│ │         ↓                                       │ │
│ │ hasMarkdown(content) ? MarkdownContent : PlainText│ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────┐
│ contentParser.tsx                                   │
│ ┌─────────────────────────────────────────────────┐ │
│ │ hasMarkdown() uses markdownConstants (11 patterns)│ │
│ │         ↓                                       │ │
│ │ If TRUE: Create MarkdownContent component      │ │
│ │ - Pass content                                 │ │
│ │ - Pass onMentionClick callback  ✅ NEW        │ │
│ │ - Pass onHashtagClick callback  ✅ NEW        │ │
│ │ - Pass enableLinkPreviews       ✅ NEW        │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────┐
│ MarkdownContent.tsx                                 │
│ ┌─────────────────────────────────────────────────┐ │
│ │ extractSpecialTokens(content)                  │ │
│ │ detectMarkdownSyntax() uses markdownConstants  │ │
│ │         ↓                                       │ │
│ │ If hasMarkdown: <ReactMarkdown />              │ │
│ │ - Render bold, italic, lists, etc.            │ │
│ │ - Preserve @mentions (clickable)   ✅         │ │
│ │ - Preserve #hashtags (clickable)   ✅         │ │
│ │ - Show link previews               ✅         │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Data Flow: Comment Creation

```
User Submits Comment
    ↓
┌─────────────────────────────────────┐
│ Frontend: CommentForm.tsx           │
│ ┌─────────────────────────────────┐ │
│ │ 1. Collect content from user    │ │
│ │ 2. Detect markdown in content   │ │
│ │ 3. Set content_type:            │ │
│ │    - 'markdown' if has markdown │ │
│ │    - 'markdown' if from agent   │ │
│ │    - 'text' otherwise           │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
         ↓ POST /api/agent-posts/:postId/comments
┌─────────────────────────────────────┐
│ Backend: server.js line 1590        │
│ ┌─────────────────────────────────┐ │
│ │ 1. Extract content_type from req│ │
│ │ 2. If not provided:             │ │
│ │    - Use 'markdown' for agents  │ │
│ │    - Use 'text' for users       │ │
│ │ 3. Save to database             │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ Database: comments table            │
│ ┌─────────────────────────────────┐ │
│ │ content_type: 'markdown' | 'text'│ │
│ │ ✅ Correct type stored          │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
         ↓ WebSocket broadcast
┌─────────────────────────────────────┐
│ Frontend: Real-time update          │
│ ┌─────────────────────────────────┐ │
│ │ 1. Receive comment via WS       │ │
│ │ 2. Render with CommentThread    │ │
│ │ 3. Auto-detect markdown (backup)│ │
│ │ 4. Show rendered markdown ✅    │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## 🧪 REFINEMENT Phase - TDD Implementation

### Test Strategy

**Phase 1: Unit Tests for PostCard**
```typescript
// File: PostCard.test.tsx (NEW)

describe('PostCard Markdown Rendering', () => {
  test('renders markdown in post content', () => {
    const post = {
      id: '1',
      title: 'Test Post',
      content: '**Bold text** and *italic*',
      authorAgent: 'avi',
      publishedAt: new Date().toISOString()
    };

    const { container } = render(<PostCard post={post} />);

    // Should render <strong> and <em> tags
    expect(container.querySelector('strong')).toBeTruthy();
    expect(container.querySelector('em')).toBeTruthy();

    // Should NOT show raw symbols
    expect(container.textContent).not.toContain('**');
  });

  test('preserves truncation with markdown', () => {
    const longContent = '**Bold** ' + 'text '.repeat(100); // > 280 chars
    const post = {
      id: '2',
      title: 'Long Post',
      content: longContent,
      authorAgent: 'avi',
      publishedAt: new Date().toISOString()
    };

    const { container, getByText } = render(<PostCard post={post} />);

    // Should show "Show more" button
    expect(getByText('Show more')).toBeTruthy();

    // Should still render markdown in truncated content
    expect(container.querySelector('strong')).toBeTruthy();
  });

  test('handles mentions and hashtags in posts', () => {
    const post = {
      id: '3',
      title: 'Test',
      content: 'Hello @alice check #update',
      authorAgent: 'avi',
      publishedAt: new Date().toISOString()
    };

    const { container } = render(<PostCard post={post} />);

    // Should render mentions and hashtags as interactive
    expect(container.querySelector('[class*="mention"]')).toBeTruthy();
    expect(container.querySelector('[class*="hashtag"]')).toBeTruthy();
  });
});
```

**Phase 2: Integration Tests**
```typescript
// File: post-comment-markdown-integration.test.tsx

describe('Post and Comment Markdown Integration', () => {
  test('both posts and comments render markdown', () => {
    // Render post with markdown
    const post = { content: '**Post content**', ... };
    const { container: postContainer } = render(<PostCard post={post} />);
    expect(postContainer.querySelector('strong')).toBeTruthy();

    // Render comment with markdown
    const comment = { content: '**Comment content**', ... };
    const { container: commentContainer } = render(<CommentThread comment={comment} />);
    expect(commentContainer.querySelector('strong')).toBeTruthy();
  });
});
```

**Phase 3: E2E Tests (Playwright)**
```typescript
// File: post-markdown-rendering.spec.ts

test('posts display markdown correctly in browser', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // Find a post card
  const postCard = page.locator('.post-card').first();
  await expect(postCard).toBeVisible();

  // Verify markdown rendered (has <strong> tags)
  const boldText = postCard.locator('strong');
  await expect(boldText).toBeVisible();

  // Verify NO raw markdown symbols
  const postContent = await postCard.textContent();
  expect(postContent).not.toContain('**');
  expect(postContent).not.toContain('##');

  // Take screenshot
  await page.screenshot({
    path: 'screenshots/post-markdown-rendered.png'
  });
});

test('new comments created with correct content_type', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // Open comment form
  const commentButton = page.locator('button:has-text("Comment")').first();
  await commentButton.click();

  // Type comment with markdown
  const textarea = page.locator('textarea[placeholder*="comment"]');
  await textarea.fill('**This is bold** and *italic*');

  // Submit
  const submitButton = page.locator('button:has-text("Post")');
  await submitButton.click();

  // Wait for comment to appear
  await page.waitForTimeout(1000);

  // Verify rendered with markdown (not raw symbols)
  const newComment = page.locator('.comment-content').last();
  const hasStrong = await newComment.locator('strong').count();
  expect(hasStrong).toBeGreaterThan(0);

  // Take screenshot
  await page.screenshot({
    path: 'screenshots/new-comment-markdown.png'
  });
});
```

---

## ✅ COMPLETION Phase - Validation Criteria

### Definition of Done

**Code Changes**:
- ✅ PostCard.tsx uses renderParsedContent()
- ✅ MarkdownContent receives all required props
- ✅ Comment creation sends content_type
- ✅ Backend smart defaults for content_type

**Testing**:
- ✅ Unit tests: PostCard markdown rendering (5+ tests)
- ✅ Integration tests: Post + Comment rendering
- ✅ E2E tests: Browser validation with screenshots (3+ tests)
- ✅ Regression: All existing tests still pass

**Browser Validation**:
- ✅ Posts show rendered markdown (NOT raw symbols)
- ✅ Comments show rendered markdown
- ✅ New comments created with correct content_type
- ✅ Mentions/hashtags clickable
- ✅ Link previews working
- ✅ Truncation still works
- ✅ No console errors

**Documentation**:
- ✅ Code comments updated
- ✅ Implementation report created
- ✅ Test results documented
- ✅ Screenshots captured as evidence

---

## 🎯 Success Metrics

**Before Fix**:
- ❌ PostCard shows `**raw symbols**`
- ❌ New comments have `content_type='text'`
- ❌ Mentions/hashtags not interactive in markdown

**After Fix**:
- ✅ PostCard shows **rendered markdown**
- ✅ New comments have correct `content_type`
- ✅ Mentions/hashtags fully interactive
- ✅ All functionality working in browser
- ✅ Zero console errors

---

## 📊 Files to Modify

| File | Type | Lines | Changes |
|------|------|-------|---------|
| `frontend/src/components/PostCard.tsx` | MODIFY | ~10 | Add markdown rendering |
| `frontend/src/utils/contentParser.tsx` | MODIFY | ~5 | Pass props to MarkdownContent |
| `api-server/server.js` | MODIFY | ~1 | Smart content_type default |
| `frontend/src/components/CommentForm.tsx` | MODIFY | ~10 | Send content_type in request |
| `frontend/src/tests/unit/PostCard.test.tsx` | NEW | ~150 | Unit tests for PostCard |
| `frontend/tests/e2e/post-markdown.spec.ts` | NEW | ~100 | E2E browser validation |

**Total**: 4 files modified, 2 new test files

---

**Status**: Ready for concurrent agent implementation
**Methodology**: SPARC + TDD + Claude-Flow Swarm
**Validation**: 100% real browser verification, no mocks
