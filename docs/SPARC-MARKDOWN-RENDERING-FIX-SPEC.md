# SPARC Specification: Markdown Rendering Fix

**Date**: October 31, 2025
**Methodology**: SPARC + NLD + TDD + Claude-Flow Swarm
**Status**: Implementation Ready

---

## S - Specification

### Problem Statement
Markdown formatting in comments and replies is not displaying correctly. Agent responses containing markdown syntax (bold, italic, lists, etc.) are rendering as plain text with raw markdown symbols.

### Root Causes Identified
1. **Database Migration Incomplete**: 144 existing comments set to `content_type='text'` when they should be `'markdown'`
2. **Strict Rendering Logic**: No fallback to auto-detect markdown syntax when `content_type` is incorrect
3. **No Safety Net**: System relies 100% on database field accuracy

### Requirements
- **R1**: All agent responses must render with markdown formatting
- **R2**: Old comments with wrong `content_type` must display correctly
- **R3**: New agent responses must continue working
- **R4**: User comments with markdown must render (future-ready)
- **R5**: Plain text comments must render without markdown processing
- **R6**: No performance degradation
- **R7**: Backwards compatible with existing code
- **R8**: 100% real verification (no mocks)

### Success Criteria
✅ Old Avi comments with markdown render with formatting
✅ New Avi comments continue to work
✅ Auto-detection fallback prevents future issues
✅ All tests pass (unit, integration, E2E)
✅ No console errors
✅ Screenshots confirm visual rendering

---

## P - Pseudocode

### Database Fix

```
FUNCTION fixContentTypeInDatabase():
  // Update all agent comments to markdown
  EXECUTE SQL:
    UPDATE comments
    SET content_type = 'markdown'
    WHERE author_agent IS NOT NULL
      AND author_agent NOT IN ('anonymous', '')

  // Verify update
  COUNT = SELECT COUNT(*) FROM comments WHERE content_type = 'markdown'

  IF COUNT > 0:
    LOG "✅ Updated {COUNT} comments to markdown"
    RETURN SUCCESS
  ELSE:
    LOG "❌ No comments updated"
    RETURN FAILURE
END FUNCTION
```

### Frontend Auto-Detection Fix

```
COMPONENT CommentThread:
  IMPORT hasMarkdown FROM 'utils/contentParser'

  FUNCTION shouldRenderMarkdown(comment):
    // Check 1: Explicit markdown type
    IF comment.contentType === 'markdown':
      RETURN TRUE

    // Check 2: Agent response with markdown syntax
    IF comment.author.type === 'agent' AND hasMarkdown(comment.content):
      RETURN TRUE

    // Check 3: User content with markdown (future feature)
    IF hasMarkdown(comment.content):
      RETURN TRUE

    // Default: Plain text
    RETURN FALSE
  END FUNCTION

  RENDER:
    displayContent = truncate(comment.content)

    IF shouldRenderMarkdown(comment):
      RENDER MarkdownContent:
        - Parse content with parseContent()
        - Enable markdown flag
        - Apply styling classes
    ELSE:
      RENDER PlainText:
        - Preserve whitespace
        - No parsing
    END IF
END COMPONENT
```

### Test Suite Structure

```
DESCRIBE "Markdown Rendering Tests":

  // Unit Tests
  TEST "hasMarkdown detects bold text":
    content = "**bold text**"
    ASSERT hasMarkdown(content) === TRUE

  TEST "hasMarkdown detects italic text":
    content = "*italic text*"
    ASSERT hasMarkdown(content) === TRUE

  TEST "hasMarkdown detects code blocks":
    content = "```code```"
    ASSERT hasMarkdown(content) === TRUE

  TEST "hasMarkdown ignores plain text":
    content = "plain text"
    ASSERT hasMarkdown(content) === FALSE

  // Integration Tests
  TEST "Agent comment with markdown renders formatted":
    comment = createComment({
      content: "**Temperature:** 56°F",
      content_type: "markdown",
      author_agent: "avi"
    })
    rendered = render(<CommentThread comment={comment} />)
    ASSERT rendered.contains("<strong>Temperature:</strong>")

  TEST "Old comment with wrong content_type still renders":
    comment = createComment({
      content: "**Bold**",
      content_type: "text",  // Wrong!
      author_agent: "avi"
    })
    rendered = render(<CommentThread comment={comment} />)
    ASSERT rendered.contains("<strong>Bold</strong>")

  // E2E Tests
  TEST "Markdown displays in browser":
    NAVIGATE TO post with Avi comments
    WAIT FOR comments to load
    aviComment = FIND comment by author "avi"
    ASSERT aviComment.querySelector("strong") EXISTS
    TAKE SCREENSHOT "markdown-rendering.png"

END DESCRIBE
```

---

## A - Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend Layer                       │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────────────────────────────────────┐  │
│  │          CommentThread Component                 │  │
│  │                                                    │  │
│  │  1. Receive comment prop                          │  │
│  │     { content, contentType, author }              │  │
│  │                                                    │  │
│  │  2. Determine rendering strategy                  │  │
│  │     ┌────────────────────────────────┐           │  │
│  │     │ shouldRenderMarkdown()         │           │  │
│  │     │                                 │           │  │
│  │     │ Check 1: contentType='markdown' │←─────────┼──┼─── Database Field
│  │     │ Check 2: agent + hasMarkdown()  │←─────────┼──┼─── Auto-Detection
│  │     │ Check 3: hasMarkdown() fallback │←─────────┼──┼─── Safety Net
│  │     └────────────────────────────────┘           │  │
│  │                                                    │  │
│  │  3. Render based on decision                      │  │
│  │     ┌──────────┐      ┌──────────────┐           │  │
│  │     │ Markdown │  OR  │  Plain Text  │           │  │
│  │     │ Parser   │      │  <p> tag     │           │  │
│  │     └──────────┘      └──────────────┘           │  │
│  └──────────────────────────────────────────────────┘  │
│                                                           │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Utility Layer                             │  │
│  │                                                    │  │
│  │  contentParser.tsx:                               │  │
│  │  ├─ hasMarkdown(content): boolean                 │  │
│  │  ├─ parseContent(content): ParsedContent[]        │  │
│  │  └─ renderParsedContent(...): JSX.Element         │  │
│  │                                                    │  │
│  │  MarkdownContent.tsx:                             │  │
│  │  └─ MarkdownContent component (react-markdown)    │  │
│  └──────────────────────────────────────────────────┘  │
│                                                           │
└─────────────────────────────────────────────────────────┘
                            ↑
                            │ API Response
                            │
┌─────────────────────────────────────────────────────────┐
│                     Backend Layer                        │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────────────────────────────────────┐  │
│  │           SQLite Database                         │  │
│  │                                                    │  │
│  │  comments table:                                   │  │
│  │  ├─ id (TEXT)                                      │  │
│  │  ├─ content (TEXT)                                 │  │
│  │  ├─ content_type (TEXT) ← 'text' or 'markdown'    │  │
│  │  ├─ author_agent (TEXT)                            │  │
│  │  └─ ...other fields                                │  │
│  │                                                    │  │
│  │  Migration Fix:                                    │  │
│  │  UPDATE comments                                   │  │
│  │  SET content_type = 'markdown'                     │  │
│  │  WHERE author_agent IS NOT NULL                    │  │
│  │                                                    │  │
│  └──────────────────────────────────────────────────┘  │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌─────────────┐
│   Database  │
│             │
│ content:    │
│ "**Bold**"  │
│             │
│ content_type│
│ "text"      │ ← WRONG VALUE (old comment)
└──────┬──────┘
       │
       │ API Response
       ↓
┌─────────────────┐
│ useCommentThreading
│                 │
│ Transform:      │
│ contentType:    │
│ "text"          │ ← Still wrong from DB
└────────┬────────┘
         │
         │ Pass to component
         ↓
┌─────────────────────────┐
│   CommentThread         │
│                         │
│ Decision Logic:         │
│ ┌─────────────────────┐│
│ │ contentType='text'  ││ ← Check 1: FAIL
│ │ BUT...              ││
│ │ author.type='agent' ││ ← Check 2: TRUE
│ │ AND                 ││
│ │ hasMarkdown()**TRUE ││ ← Check 2: TRUE
│ └─────────────────────┘│
│                         │
│ Result: RENDER MARKDOWN │ ← AUTO-DETECTION SAVES US!
└────────┬────────────────┘
         │
         ↓
┌─────────────────┐
│  MarkdownContent│
│                 │
│ <strong>        │
│   Bold          │
│ </strong>       │ ← RENDERED CORRECTLY ✅
└─────────────────┘
```

### Component Relationships

```
PostCard.tsx
  └─ CommentSystem.tsx
       └─ CommentThread.tsx ← FIX HERE
            ├─ Import hasMarkdown
            ├─ Add shouldRenderMarkdown()
            └─ Update render logic
                 ├─ Path A: renderParsedContent()
                 │         └─ MarkdownContent component
                 └─ Path B: <p> plain text
```

---

## R - Refinement (Implementation Details)

### File Changes Required

#### 1. Database Migration Script
**File**: `/workspaces/agent-feed/docs/migrations/2025-10-31-fix-markdown-content-type.sql`

```sql
-- Markdown Content Type Fix
-- Date: October 31, 2025
-- Purpose: Update agent comments to have correct content_type

-- Before state:
-- SELECT content_type, COUNT(*) FROM comments GROUP BY content_type;
-- text: 144, markdown: 3

-- Update agent comments to markdown
UPDATE comments
SET content_type = 'markdown'
WHERE author_agent IS NOT NULL
  AND author_agent NOT IN ('anonymous', '');

-- After state:
-- SELECT content_type, COUNT(*) FROM comments GROUP BY content_type;
-- text: ~94 (user comments), markdown: ~53 (agent comments)

-- Verification queries:
SELECT
  content_type,
  COUNT(*) as total,
  COUNT(CASE WHEN author_agent IS NOT NULL THEN 1 END) as agent_comments,
  COUNT(CASE WHEN author_agent IS NULL THEN 1 END) as user_comments
FROM comments
GROUP BY content_type;

-- Sample agent comments to verify rendering:
SELECT
  id,
  substr(content, 1, 60) as preview,
  content_type,
  author_agent
FROM comments
WHERE author_agent = 'avi'
ORDER BY created_at DESC
LIMIT 5;
```

#### 2. CommentThread Component Enhancement
**File**: `/workspaces/agent-feed/frontend/src/components/comments/CommentThread.tsx`

**Changes**:

```typescript
// Line 21 - Add import
import { hasMarkdown } from '../../utils/contentParser';

// Line 68 - Add helper function after shouldTruncateContent
/**
 * Determine if comment should render as markdown
 *
 * Strategy:
 * 1. Check explicit contentType='markdown' (primary)
 * 2. Check if agent response with markdown syntax (fallback)
 * 3. Check if any content has markdown syntax (safety net)
 */
const shouldRenderMarkdown = useMemo(() => {
  // Primary: Explicit markdown type
  if (comment.contentType === 'markdown') {
    return true;
  }

  // Fallback: Agent responses likely to have markdown
  if (comment.author.type === 'agent' && hasMarkdown(displayContent)) {
    console.log('[CommentThread] Auto-detected markdown in agent comment:', comment.id);
    return true;
  }

  // Safety net: Any markdown syntax (future-ready for user markdown)
  if (hasMarkdown(displayContent)) {
    console.log('[CommentThread] Auto-detected markdown in comment:', comment.id);
    return true;
  }

  return false;
}, [comment.contentType, comment.author.type, displayContent]);

// Line 194-200 - Update render logic
<div className="prose prose-sm max-w-none text-gray-800 dark:text-gray-200 leading-relaxed">
  {shouldRenderMarkdown ? (
    renderParsedContent(parseContent(displayContent), {
      className: 'comment-parsed-content',
      enableMarkdown: true
    })
  ) : (
    <p className="whitespace-pre-wrap">{displayContent}</p>
  )}
</div>
```

#### 3. Test Files to Create

**File 1**: `/workspaces/agent-feed/frontend/src/tests/unit/markdown-detection.test.tsx`

```typescript
import { describe, test, expect } from 'vitest';
import { hasMarkdown } from '../../utils/contentParser';

describe('Markdown Detection', () => {
  test('detects bold text', () => {
    expect(hasMarkdown('**bold**')).toBe(true);
    expect(hasMarkdown('**Temperature:** 56°F')).toBe(true);
  });

  test('detects italic text', () => {
    expect(hasMarkdown('*italic*')).toBe(true);
    expect(hasMarkdown('_italic_')).toBe(true);
  });

  test('detects code blocks', () => {
    expect(hasMarkdown('`code`')).toBe(true);
    expect(hasMarkdown('```javascript\ncode\n```')).toBe(true);
  });

  test('detects headers', () => {
    expect(hasMarkdown('# Header 1')).toBe(true);
    expect(hasMarkdown('## Header 2')).toBe(true);
  });

  test('detects lists', () => {
    expect(hasMarkdown('- item 1')).toBe(true);
    expect(hasMarkdown('1. item 1')).toBe(true);
  });

  test('detects blockquotes', () => {
    expect(hasMarkdown('> quote')).toBe(true);
  });

  test('detects links', () => {
    expect(hasMarkdown('[link](url)')).toBe(true);
  });

  test('ignores plain text', () => {
    expect(hasMarkdown('plain text')).toBe(false);
    expect(hasMarkdown('This is a normal sentence.')).toBe(false);
  });

  test('ignores single asterisks in normal text', () => {
    expect(hasMarkdown('5 * 6 = 30')).toBe(false);
  });
});
```

**File 2**: `/workspaces/agent-feed/frontend/src/tests/integration/comment-markdown-rendering.test.tsx`

```typescript
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CommentThread } from '../../components/comments/CommentThread';
import { CommentTreeNode } from '../../components/comments/CommentSystem';

const createTestComment = (overrides: Partial<CommentTreeNode>): CommentTreeNode => ({
  id: 'test-comment-1',
  content: 'Test content',
  contentType: 'text',
  author: {
    type: 'user',
    id: 'test-user',
    name: 'Test User'
  },
  metadata: {
    threadDepth: 0,
    threadPath: '/test-comment-1/',
    replyCount: 0,
    likeCount: 0,
    reactionCount: 0,
    isAgentResponse: false
  },
  engagement: {
    likes: 0,
    reactions: {},
    userReacted: false
  },
  status: 'published',
  children: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides
});

describe('Comment Markdown Rendering', () => {
  test('renders explicit markdown content', () => {
    const comment = createTestComment({
      content: '**Bold text**',
      contentType: 'markdown'
    });

    const { container } = render(
      <CommentThread
        comment={comment}
        depth={0}
        maxDepth={10}
        onReply={async () => {}}
        onReaction={async () => {}}
      />
    );

    // Should contain <strong> tag
    expect(container.querySelector('strong')).toBeTruthy();
    expect(container.querySelector('strong')?.textContent).toBe('Bold text');
  });

  test('auto-detects markdown in agent comments with wrong content_type', () => {
    const comment = createTestComment({
      content: '**Temperature:** 56°F',
      contentType: 'text', // Wrong! But should still render as markdown
      author: {
        type: 'agent',
        id: 'avi',
        name: 'avi'
      }
    });

    const { container } = render(
      <CommentThread
        comment={comment}
        depth={0}
        maxDepth={10}
        onReply={async () => {}}
        onReaction={async () => {}}
      />
    );

    // Should auto-detect and render markdown
    expect(container.querySelector('strong')).toBeTruthy();
    expect(container.querySelector('strong')?.textContent).toBe('Temperature:');
  });

  test('renders plain text without markdown processing', () => {
    const comment = createTestComment({
      content: 'Plain text comment',
      contentType: 'text'
    });

    const { container } = render(
      <CommentThread
        comment={comment}
        depth={0}
        maxDepth={10}
        onReply={async () => {}}
        onReaction={async () => {}}
      />
    );

    // Should NOT contain markdown elements
    expect(container.querySelector('strong')).toBeFalsy();
    expect(container.textContent).toContain('Plain text comment');
  });

  test('renders code blocks in markdown', () => {
    const comment = createTestComment({
      content: '```javascript\nconst x = 1;\n```',
      contentType: 'markdown',
      author: {
        type: 'agent',
        id: 'avi',
        name: 'avi'
      }
    });

    const { container } = render(
      <CommentThread
        comment={comment}
        depth={0}
        maxDepth={10}
        onReply={async () => {}}
        onReaction={async () => {}}
      />
    );

    // Should contain <code> tag
    expect(container.querySelector('code')).toBeTruthy();
  });

  test('renders lists in markdown', () => {
    const comment = createTestComment({
      content: '- Item 1\n- Item 2\n- Item 3',
      contentType: 'markdown',
      author: {
        type: 'agent',
        id: 'avi',
        name: 'avi'
      }
    });

    const { container } = render(
      <CommentThread
        comment={comment}
        depth={0}
        maxDepth={10}
        onReply={async () => {}}
        onReaction={async () => {}}
      />
    );

    // Should contain <ul> and <li> tags
    expect(container.querySelector('ul')).toBeTruthy();
    expect(container.querySelectorAll('li').length).toBe(3);
  });
});
```

**File 3**: `/workspaces/agent-feed/frontend/src/tests/e2e/markdown-rendering.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Markdown Rendering in Comments', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto('http://localhost:5173');

    // Wait for app to load
    await page.waitForSelector('[data-testid="feed"]', { timeout: 10000 });
  });

  test('displays markdown formatting in Avi comments', async ({ page }) => {
    // Find a post with comments
    const postCard = page.locator('[data-testid="post-card"]').first();
    await postCard.scrollIntoViewIfNeeded();

    // Click to expand comments
    const commentButton = postCard.locator('button:has-text("Comments")');
    await commentButton.click();

    // Wait for comments to load
    await page.waitForSelector('.comment-card', { timeout: 5000 });

    // Find Avi's comment
    const aviComment = page.locator('.comment-card').filter({
      has: page.locator('text=avi')
    }).first();

    // Check for markdown elements
    const hasBold = await aviComment.locator('strong').count() > 0;
    const hasCode = await aviComment.locator('code').count() > 0;
    const hasList = await aviComment.locator('ul, ol').count() > 0;

    // At least one markdown element should be present
    expect(hasBold || hasCode || hasList).toBe(true);

    // Take screenshot
    await aviComment.screenshot({ path: 'test-results/markdown-rendering-avi-comment.png' });
  });

  test('old Avi comments with markdown render correctly', async ({ page }) => {
    // Navigate to specific post with old Avi comment
    // Post ID: post-1761885761171 (weather comment)

    // Create a comment to trigger Avi response if needed
    const postCard = page.locator('[data-testid="post-card"]').first();
    await postCard.scrollIntoViewIfNeeded();

    // Open comments
    await postCard.locator('button:has-text("Comments")').click();
    await page.waitForTimeout(2000);

    // Find weather-related comment
    const weatherComment = page.locator('.comment-card').filter({
      hasText: /temperature|weather/i
    }).first();

    // Should have bold formatting
    const boldElements = await weatherComment.locator('strong').count();
    expect(boldElements).toBeGreaterThan(0);

    // Take screenshot
    await weatherComment.screenshot({ path: 'test-results/markdown-old-comment.png' });
  });

  test('plain text comments remain unformatted', async ({ page }) => {
    // Find a user comment (not agent)
    const userComment = page.locator('.comment-card').filter({
      has: page.locator('[data-author-type="user"]')
    }).first();

    if (await userComment.count() > 0) {
      // Should NOT have markdown elements if plain text
      const content = await userComment.locator('.comment-content').textContent();

      // If content has no markdown syntax, shouldn't have markdown elements
      if (!content?.includes('**') && !content?.includes('`')) {
        const hasMarkdownElements =
          (await userComment.locator('strong').count()) > 0 ||
          (await userComment.locator('code').count()) > 0;

        expect(hasMarkdownElements).toBe(false);
      }
    }
  });

  test('markdown auto-detection works for new comments', async ({ page }) => {
    // Post a new comment via API with markdown but wrong content_type
    const response = await page.request.post('http://localhost:3001/api/agent-posts/post-1761885761171/comments', {
      data: {
        content: '**This is a test** with `code`',
        userId: 'e2e-test-user',
        content_type: 'text' // Wrong! Should auto-detect
      }
    });

    expect(response.ok()).toBe(true);

    // Wait for WebSocket update
    await page.waitForTimeout(2000);

    // Find the new comment
    const newComment = page.locator('.comment-card').filter({
      hasText: 'This is a test'
    }).first();

    // Should still render as markdown due to auto-detection
    const hasBold = await newComment.locator('strong').count() > 0;
    const hasCode = await newComment.locator('code').count() > 0;

    expect(hasBold || hasCode).toBe(true);

    // Take screenshot
    await newComment.screenshot({ path: 'test-results/markdown-auto-detection.png' });
  });
});
```

---

## C - Completion (Validation Plan)

### Phase 1: Database Migration
1. Execute UPDATE query on comments table
2. Verify count of markdown vs text comments
3. Sample 5 Avi comments to confirm content_type='markdown'

### Phase 2: Code Implementation
1. Update CommentThread.tsx with auto-detection logic
2. Add hasMarkdown import
3. Add shouldRenderMarkdown helper
4. Update render conditional

### Phase 3: Testing
1. Run unit tests for hasMarkdown()
2. Run integration tests for CommentThread rendering
3. Run Playwright E2E tests
4. All tests must pass

### Phase 4: Real Verification
1. Restart frontend server
2. Open browser to http://localhost:5173
3. Navigate to post with Avi comments
4. Verify bold text renders as <strong>
5. Verify lists render as <ul>/<li>
6. Take screenshots

### Phase 5: Regression Testing
1. Verify plain text comments still work
2. Verify new comments render correctly
3. Verify WebSocket updates work
4. Check for console errors
5. Run full test suite

### Validation Checklist

```
Database:
☐ UPDATE query executed successfully
☐ Verified count: ~50+ markdown comments
☐ Sample queries show content_type='markdown' for agents

Code:
☐ hasMarkdown imported
☐ shouldRenderMarkdown function added
☐ Render logic updated
☐ No TypeScript errors

Tests:
☐ Unit tests: 10/10 passing
☐ Integration tests: 5/5 passing
☐ E2E tests: 4/4 passing
☐ No console errors

Visual:
☐ Bold text renders with <strong> tags
☐ Italic text renders with <em> tags
☐ Code blocks render with <code> tags
☐ Lists render with <ul>/<li> tags
☐ Screenshots captured

Regression:
☐ Old plain text comments work
☐ New comments render correctly
☐ WebSocket updates work
☐ No performance degradation
☐ Backwards compatible
```

---

## Agent Coordination Plan

### Concurrent Agents (Claude-Flow Swarm)

**Agent 1 - Database Engineer**
- Execute UPDATE query
- Verify migration
- Create rollback script
- Document changes

**Agent 2 - Frontend Developer**
- Update CommentThread.tsx
- Add auto-detection logic
- Import necessary utilities
- Handle edge cases

**Agent 3 - Test Engineer**
- Write unit tests
- Write integration tests
- Create test fixtures
- Ensure 100% coverage

**Agent 4 - E2E Engineer**
- Create Playwright tests
- Test real browser rendering
- Capture screenshots
- Verify visual correctness

**Agent 5 - QA Validator**
- Manual testing
- Regression testing
- Performance testing
- Create validation report

All agents work concurrently and report back with results.

---

**SPARC Specification Complete** ✅
**Ready for Agent Swarm Execution** ✅
