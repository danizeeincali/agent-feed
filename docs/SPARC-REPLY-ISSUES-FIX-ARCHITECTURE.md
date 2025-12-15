# SPARC Architecture: Reply Issues Fix
## Date Field Handling & Endpoint Correction

**Created**: 2025-10-27
**Status**: Architecture Complete
**Phase**: Architecture (SPARC Methodology)

---

## Executive Summary

This architecture addresses two critical issues in the comment system:
1. **Date Field Mapping**: Backend returns `created_at` (snake_case), frontend expects `createdAt` (camelCase)
2. **Endpoint Mismatch**: PostCard.tsx uses incorrect endpoint `/api/v1/posts/` instead of `/api/v1/agent-posts/`

Both issues prevent proper comment display and reply functionality.

---

## System Context

```
┌─────────────────────────────────────────────────────────────────┐
│                        Comment System Flow                       │
└─────────────────────────────────────────────────────────────────┘

User Action (Reply)
       │
       ▼
┌──────────────────┐
│  CommentThread   │ ◄── Uses inline reply form (MentionInput)
│                  │     Calls handleReply with parent_id
└────────┬─────────┘
         │
         │ POST /api/agent-posts/:postId/comments
         │ { content, parent_id, author_agent }
         ▼
┌──────────────────┐
│   API Server     │
│  server.js       │ ◄── Creates comment with created_at field
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Database        │
│  (PostgreSQL/    │ ◄── Stores with created_at (snake_case)
│   SQLite)        │
└────────┬─────────┘
         │
         │ Returns comment with created_at
         ▼
┌──────────────────┐
│  PostCard.tsx    │
│                  │ ◄── ISSUE: Uses wrong endpoint
│  loadComments()  │     /api/v1/posts/ instead of
└────────┬─────────┘     /api/v1/agent-posts/
         │
         │ onCommentsUpdate() callback
         ▼
┌──────────────────┐
│  CommentThread   │ ◄── ISSUE: Expects createdAt (camelCase)
│                  │     Gets created_at (snake_case)
│  formatTimestamp │     Result: "invalid date"
└──────────────────┘
```

---

## Architecture Components

### 1. Data Transformation Layer

**Purpose**: Transform API responses to frontend-compatible format

**Location**: Between API client and React components

**Design Pattern**: Adapter Pattern

```typescript
┌─────────────────────────────────────────────────────────┐
│               Data Transformation Layer                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  API Response (snake_case)                              │
│  {                                                       │
│    id: "abc-123",                                       │
│    content: "Reply text",                               │
│    author: "user-1",                                    │
│    created_at: "2025-10-27T10:30:00Z",  ◄── Backend     │
│    updated_at: "2025-10-27T10:30:00Z",                  │
│    parent_id: "parent-abc",                             │
│    ...                                                   │
│  }                                                       │
│                                                          │
│                        ▼                                 │
│                   TRANSFORM                              │
│                        ▼                                 │
│                                                          │
│  Frontend Format (camelCase + dual fields)              │
│  {                                                       │
│    id: "abc-123",                                       │
│    content: "Reply text",                               │
│    author: "user-1",                                    │
│    created_at: "2025-10-27T10:30:00Z",  ◄── Keep for    │
│    createdAt: "2025-10-27T10:30:00Z",   ◄── Add this    │
│    updated_at: "2025-10-27T10:30:00Z",                  │
│    updatedAt: "2025-10-27T10:30:00Z",                   │
│    parent_id: "parent-abc",                             │
│    parentId: "parent-abc",                              │
│    ...                                                   │
│  }                                                       │
└─────────────────────────────────────────────────────────┘
```

### 2. Field Mapping Strategy

**Approach**: Dual-field support for backward compatibility

**Rationale**:
- Some components may already use `created_at`
- Some components expect `createdAt`
- Both fields ensure compatibility during transition

```typescript
┌──────────────────────────────────────────────────────┐
│           Field Mapping Architecture                  │
├──────────────────────────────────────────────────────┤
│                                                       │
│  Layer 1: API Response (Backend)                     │
│  ─────────────────────────────────                   │
│  Fields: created_at, updated_at, parent_id           │
│                                                       │
│                        ▼                              │
│                                                       │
│  Layer 2: Data Transformation                        │
│  ────────────────────────────────                    │
│  Function: transformCommentDates()                   │
│  - Preserve original fields (created_at, etc.)       │
│  - Add camelCase aliases (createdAt, etc.)           │
│  - Validate date formats                             │
│                                                       │
│                        ▼                              │
│                                                       │
│  Layer 3: Component Consumption                      │
│  ──────────────────────────────                      │
│  - CommentThread: Uses created_at || createdAt       │
│  - PostCard: Uses both formats safely                │
│  - formatTimestamp: Handles both + validation        │
│                                                       │
└──────────────────────────────────────────────────────┘
```

### 3. Endpoint Correction Architecture

**Issue**: PostCard.tsx uses incorrect endpoint pattern

**Current (WRONG)**:
```
GET /api/v1/posts/${post.id}/comments
```

**Correct**:
```
GET /api/v1/agent-posts/${post.id}/comments
```

**Architecture Decision**: Fix endpoint at call site (PostCard.tsx)

```typescript
┌─────────────────────────────────────────────────────────┐
│              Endpoint Correction Flow                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  PostCard.tsx - loadComments()                          │
│  ─────────────────────────────────                      │
│                                                          │
│  BEFORE (Line 101):                                     │
│  const response = await fetch(                          │
│    `/api/v1/posts/${post.id}/comments`                 │
│  );                          ▲                          │
│                              │                          │
│                         Wrong endpoint                  │
│                              │                          │
│                                                          │
│  AFTER:                                                 │
│  const response = await fetch(                          │
│    `/api/agent-posts/${post.id}/comments`              │
│  );                          ▲                          │
│                              │                          │
│                      Correct endpoint                   │
│                              │                          │
│                              ▼                          │
│                                                          │
│  Server.js (Lines 1540, 1678)                           │
│  ────────────────────────────                           │
│  ✅ GET /api/agent-posts/:postId/comments               │
│  ✅ GET /api/v1/agent-posts/:postId/comments            │
│                                                          │
│  Both endpoints supported for compatibility             │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### 1. PostCard.tsx

**Responsibilities**:
- Load comments for a post
- Display comment count
- Toggle comment visibility
- Trigger comment refresh

**Changes Required**:
1. Fix endpoint in `loadComments()` function (Line 101)
2. Ensure date transformation on comment load
3. Maintain backward compatibility

```typescript
┌─────────────────────────────────────────────────┐
│            PostCard Component Flow               │
├─────────────────────────────────────────────────┤
│                                                  │
│  User clicks "Show Comments"                    │
│         │                                        │
│         ▼                                        │
│  handleCommentsToggle()                         │
│         │                                        │
│         ▼                                        │
│  loadComments()                                 │
│         │                                        │
│         ├── Fix endpoint                        │
│         │   /api/agent-posts/${postId}/comments │
│         │                                        │
│         ├── Fetch response                      │
│         │                                        │
│         ├── Transform dates                     │
│         │   transformCommentDates(data.data)    │
│         │                                        │
│         └── Set state                           │
│             setComments(transformedComments)    │
│                                                  │
│         Pass to CommentThread                   │
│         │                                        │
│         ▼                                        │
│  <CommentThread                                 │
│    comments={comments}                          │
│    onCommentsUpdate={handleCommentsUpdate}      │
│  />                                             │
│                                                  │
└─────────────────────────────────────────────────┘
```

### 2. CommentThread.tsx

**Current State**: Already handles both date formats (user modified)

**Architecture**:
```typescript
// Comment interface supports both formats
interface Comment {
  id: string;
  content: string;
  author: string;
  createdAt?: string;   // Optional (camelCase)
  created_at?: string;  // Optional (snake_case from API)
  updatedAt?: string;
  parentId?: string;
  replies?: Comment[];
  // ... other fields
}

// formatTimestamp handles both gracefully
const formatTimestamp = (timestamp: string | undefined) => {
  if (!timestamp) return 'unknown';

  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return 'invalid date';

  // ... relative time formatting
};

// Usage: Fallback pattern
formatTimestamp(comment.created_at || comment.createdAt)
```

**Design Decision**: CommentThread already implements defensive programming - no changes needed

---

## Data Flow Architecture

### Complete Request-Response Cycle

```
┌─────────────────────────────────────────────────────────────┐
│          Reply Comment Complete Data Flow                    │
└─────────────────────────────────────────────────────────────┘

1. USER ACTION
   │
   User clicks "Reply" on comment in CommentThread
   │
   ▼

2. COMPONENT STATE
   │
   CommentItem sets isReplying = true
   Renders MentionInput for reply
   │
   ▼

3. REPLY SUBMISSION
   │
   handleReplySubmit() in CommentItem
   │
   ├─ Validate content
   ├─ Call onReply(comment.id, replyContent)
   │
   ▼

4. API REQUEST
   │
   CommentThread.handleReply()
   │
   POST /api/agent-posts/${postId}/comments
   Headers: { 'x-user-id': currentUser }
   Body: {
     content: "Reply text",
     parent_id: "parent-comment-id",  ◄── Links to parent
     author: "current-user",
     author_agent: "current-user"
   }
   │
   ▼

5. SERVER PROCESSING
   │
   server.js POST /api/agent-posts/:postId/comments
   │
   ├─ Validate content, author
   ├─ Create comment with UUID
   ├─ Set parent_id for threading
   ├─ Insert into database
   │  └─ Fields: created_at, updated_at (snake_case)
   │
   ├─ Create work queue ticket (optional)
   │
   └─ Return response
      {
        success: true,
        data: {
          id: "new-comment-id",
          post_id: "post-123",
          content: "Reply text",
          author: "current-user",
          author_agent: "current-user",
          parent_id: "parent-comment-id",
          created_at: "2025-10-27T10:30:00Z",  ◄── snake_case
          updated_at: "2025-10-27T10:30:00Z",
          depth: 1,
          thread_path: "parent-id.new-id"
        }
      }
   │
   ▼

6. COMPONENT REFRESH
   │
   onCommentsUpdate() callback triggered
   │
   ├─ PostCard.handleCommentsUpdate()
   │  └─ Sets commentsLoaded = false
   │     Triggers loadComments() again
   │
   ▼

7. RELOAD COMMENTS
   │
   PostCard.loadComments()
   │
   GET /api/agent-posts/${post.id}/comments  ◄── FIXED ENDPOINT
   │
   ▼

8. DATA TRANSFORMATION
   │
   API returns comments with created_at
   │
   transformCommentDates() ◄── NEW LAYER
   │
   For each comment:
     comment.createdAt = comment.created_at  ◄── Add alias
     comment.updatedAt = comment.updated_at
     comment.parentId = comment.parent_id
   │
   ▼

9. COMPONENT UPDATE
   │
   setComments(transformedComments)
   │
   CommentThread receives updated comments
   │
   ├─ buildCommentTree() organizes by parent_id
   ├─ Renders nested structure
   └─ formatTimestamp(comment.created_at || comment.createdAt)
      └─ Shows "1m ago", "5h ago", etc.  ◄── WORKS!
   │
   ▼

10. UI DISPLAY
    │
    User sees new reply properly threaded
    With correct timestamp
    In correct position in thread hierarchy
```

---

## Error Handling Architecture

### 1. Date Validation Strategy

```typescript
┌────────────────────────────────────────────────────┐
│          Date Field Error Handling                  │
├────────────────────────────────────────────────────┤
│                                                     │
│  Level 1: Transformation                           │
│  ──────────────────────                            │
│  transformCommentDates(comment) {                  │
│    // Handle missing fields                        │
│    if (!comment.created_at && !comment.createdAt) {│
│      comment.createdAt = new Date().toISOString(); │
│    }                                                │
│    // Add alias safely                             │
│    if (comment.created_at) {                       │
│      comment.createdAt = comment.created_at;       │
│    }                                                │
│    return comment;                                 │
│  }                                                  │
│                                                     │
│  Level 2: Component Rendering                      │
│  ────────────────────────────                      │
│  formatTimestamp(timestamp: string | undefined) {  │
│    if (!timestamp) return 'unknown';               │
│                                                     │
│    const date = new Date(timestamp);               │
│    if (isNaN(date.getTime())) {                    │
│      return 'invalid date';                        │
│    }                                                │
│    // ... format relative time                     │
│  }                                                  │
│                                                     │
│  Level 3: Fallback Display                         │
│  ──────────────────────────                        │
│  {formatTimestamp(                                 │
│    comment.created_at ||     ◄── Try snake_case    │
│    comment.createdAt ||      ◄── Try camelCase     │
│    new Date().toISOString()  ◄── Ultimate fallback │
│  )}                                                 │
│                                                     │
└────────────────────────────────────────────────────┘
```

### 2. Endpoint Error Recovery

```typescript
┌────────────────────────────────────────────────────┐
│        Endpoint Error Handling Flow                 │
├────────────────────────────────────────────────────┤
│                                                     │
│  loadComments() {                                  │
│    try {                                            │
│      const response = await fetch(                 │
│        `/api/agent-posts/${post.id}/comments`     │
│      );                                             │
│                                                     │
│      if (!response.ok) {                           │
│        // Log error with endpoint info             │
│        console.error(                              │
│          'Failed to load comments:',              │
│          response.status,                          │
│          'Endpoint:',                              │
│          `/api/agent-posts/${post.id}/comments`   │
│        );                                           │
│        return; // Exit gracefully                  │
│      }                                              │
│                                                     │
│      const data = await response.json();           │
│                                                     │
│      // Validate response structure                │
│      if (!data.success || !data.data) {           │
│        console.error('Invalid response format');   │
│        return;                                      │
│      }                                              │
│                                                     │
│      // Transform and set comments                 │
│      const transformed = data.data.map(            │
│        transformCommentDates                       │
│      );                                             │
│      setComments(transformed);                     │
│                                                     │
│    } catch (error) {                               │
│      console.error('Failed to load comments:', error);│
│      // UI shows empty state, doesn't crash        │
│    }                                                │
│  }                                                  │
│                                                     │
└────────────────────────────────────────────────────┘
```

---

## Transformation Interface Specification

### Core Transformation Function

```typescript
/**
 * Transform comment date fields from snake_case to camelCase
 * Maintains backward compatibility by keeping both formats
 *
 * @param comment - Raw comment from API
 * @returns Comment with both snake_case and camelCase date fields
 */
interface CommentTransformInput {
  id: string;
  content: string;
  author: string;
  created_at?: string;
  updated_at?: string;
  parent_id?: string | null;
  // ... other fields
}

interface CommentTransformOutput extends CommentTransformInput {
  createdAt: string;    // Added
  updatedAt?: string;   // Added
  parentId?: string | null; // Added
}

function transformCommentDates(
  comment: CommentTransformInput
): CommentTransformOutput {
  return {
    ...comment,
    // Add camelCase aliases while preserving originals
    createdAt: comment.created_at || new Date().toISOString(),
    updatedAt: comment.updated_at || comment.created_at,
    parentId: comment.parent_id || undefined
  };
}

// Batch transformation for arrays
function transformCommentsArray(
  comments: CommentTransformInput[]
): CommentTransformOutput[] {
  return comments.map(transformCommentDates);
}
```

### Integration Points

```typescript
┌─────────────────────────────────────────────────┐
│      Transformation Integration Points          │
├─────────────────────────────────────────────────┤
│                                                  │
│  1. PostCard.loadComments()                     │
│     ─────────────────────────                   │
│     const data = await response.json();         │
│     const transformed = transformCommentsArray( │
│       data.data                                 │
│     );                                           │
│     setComments(transformed);                   │
│                                                  │
│  2. PostCard.handleCommentsUpdate()             │
│     ──────────────────────────────              │
│     // Triggers loadComments() which transforms │
│     setCommentsLoaded(false);                   │
│     loadComments();                             │
│                                                  │
│  3. CommentThread.handleReply()                 │
│     ──────────────────────────                  │
│     // After POST, refresh triggers             │
│     onCommentsUpdate?.();                       │
│     // Which cascades to PostCard.loadComments()│
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## Backward Compatibility Strategy

### Dual-Field Support Matrix

```
┌────────────────────────────────────────────────────────┐
│        Component Field Usage Compatibility             │
├──────────────┬─────────────────┬──────────────────────┤
│ Component    │ Current Usage   │ After Fix            │
├──────────────┼─────────────────┼──────────────────────┤
│ CommentThread│ created_at ||   │ ✅ No change needed  │
│              │ createdAt       │    Already defensive │
├──────────────┼─────────────────┼──────────────────────┤
│ PostCard     │ N/A (passes     │ ✅ Adds transform    │
│              │ through)        │    Provides both     │
├──────────────┼─────────────────┼──────────────────────┤
│ CommentForm  │ N/A (creates)   │ ✅ No change         │
│              │                 │    Uses API as-is    │
├──────────────┼─────────────────┼──────────────────────┤
│ API Server   │ Returns         │ ✅ No change         │
│              │ created_at      │    Maintains format  │
└──────────────┴─────────────────┴──────────────────────┘

Compatibility Guarantee:
- Old code using created_at: ✅ Still works
- Old code using createdAt: ✅ Now works
- New code: ✅ Can use either
- API: ✅ No breaking changes
```

---

## Deployment Strategy

### Phase 1: Fix Endpoint (Critical)
```
Priority: HIGH
Impact: Immediate - Comments won't load without this
Risk: LOW - Simple URL change

Changes:
  - PostCard.tsx line 101: Fix endpoint URL
  - Test: Verify comments load on page
```

### Phase 2: Add Transformation (Enhancement)
```
Priority: MEDIUM
Impact: Fixes date display
Risk: LOW - Additive change

Changes:
  - Add transformCommentDates() utility
  - Apply in PostCard.loadComments()
  - Test: Verify timestamps show correctly
```

### Phase 3: Validation (Optional)
```
Priority: LOW
Impact: Better error messages
Risk: MINIMAL

Changes:
  - Enhanced error logging
  - Data validation checks
  - Performance monitoring
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('transformCommentDates', () => {
  test('adds camelCase aliases', () => {
    const input = {
      id: '123',
      content: 'Test',
      author: 'user',
      created_at: '2025-10-27T10:00:00Z'
    };

    const output = transformCommentDates(input);

    expect(output.created_at).toBe('2025-10-27T10:00:00Z');
    expect(output.createdAt).toBe('2025-10-27T10:00:00Z');
  });

  test('handles missing created_at', () => {
    const input = {
      id: '123',
      content: 'Test',
      author: 'user'
    };

    const output = transformCommentDates(input);

    expect(output.createdAt).toBeDefined();
    expect(new Date(output.createdAt).getTime()).toBeGreaterThan(0);
  });
});
```

### Integration Tests

```typescript
describe('PostCard comment loading', () => {
  test('loads comments with correct endpoint', async () => {
    const response = await fetch('/api/agent-posts/post-123/comments');
    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toBeInstanceOf(Array);
  });

  test('transforms dates after loading', async () => {
    // Mock component
    const { result } = renderHook(() => usePostCard(mockPost));

    await act(async () => {
      await result.current.loadComments();
    });

    const comments = result.current.comments;
    expect(comments[0].createdAt).toBeDefined();
    expect(comments[0].created_at).toBeDefined();
  });
});
```

### E2E Tests

```typescript
describe('Comment reply flow', () => {
  test('reply shows with correct timestamp', async () => {
    // 1. Load post with comments
    await page.goto('/feed');
    await page.click('[data-testid="post-123"]');
    await page.click('[data-testid="show-comments"]');

    // 2. Post a reply
    await page.click('[data-testid="reply-button-comment-456"]');
    await page.fill('[data-testid="reply-input"]', 'Test reply');
    await page.click('[data-testid="submit-reply"]');

    // 3. Verify reply appears
    await page.waitForSelector('[data-testid="comment-new"]');
    const timestamp = await page.textContent(
      '[data-testid="comment-new"] .timestamp'
    );

    // Should show relative time, not "invalid date"
    expect(timestamp).toMatch(/^(now|\d+[mhd] ago)$/);
  });
});
```

---

## Performance Considerations

### Transformation Overhead

```
┌────────────────────────────────────────────────┐
│       Performance Impact Analysis              │
├────────────────────────────────────────────────┤
│                                                 │
│ Operation: transformCommentDates()             │
│ Complexity: O(1) per comment                   │
│ Memory: O(1) per comment (new fields only)     │
│                                                 │
│ Scenario: 100 comments                         │
│ - Transform time: ~0.1ms                       │
│ - Memory overhead: ~400 bytes                  │
│                                                 │
│ Impact: NEGLIGIBLE                             │
│ - < 0.1% of total page load time               │
│ - < 0.01% of memory footprint                  │
│                                                 │
│ Optimization: Not needed                       │
│ - Simple field assignment                      │
│ - No deep cloning                              │
│ - No validation overhead                       │
│                                                 │
└────────────────────────────────────────────────┘
```

---

## Security Considerations

### Data Sanitization

```typescript
┌────────────────────────────────────────────────┐
│          Security Architecture                  │
├────────────────────────────────────────────────┤
│                                                 │
│ Layer 1: API Server                            │
│ ──────────────────                             │
│ - Validates date formats on insert             │
│ - Uses ISO 8601 standard                       │
│ - Database constraints prevent invalid dates   │
│                                                 │
│ Layer 2: Transformation                        │
│ ─────────────────────                          │
│ - Read-only operation                          │
│ - No user input processed                      │
│ - No XSS risk (just date copying)              │
│                                                 │
│ Layer 3: Component Display                     │
│ ──────────────────────────                     │
│ - formatTimestamp validates date               │
│ - Returns safe string ('invalid date')         │
│ - No HTML injection                            │
│                                                 │
│ Risk Assessment: LOW                           │
│ - No new attack surface                        │
│ - Defensive validation in place                │
│                                                 │
└────────────────────────────────────────────────┘
```

---

## Migration Path

### Current State → Fixed State

```
CURRENT STATE (Broken)
━━━━━━━━━━━━━━━━━━━━━━

  PostCard.tsx
  ├─ GET /api/v1/posts/${postId}/comments  ❌ Wrong endpoint
  └─ setComments(data.data)                 ❌ No transformation

  ↓ Pass to child

  CommentThread.tsx
  ├─ Receives: { created_at: "..." }        ❌ snake_case only
  └─ Uses: comment.createdAt                ❌ Undefined!
      formatTimestamp(undefined)            ❌ "invalid date"

  Result: Comments show "invalid date" timestamp


FIXED STATE
━━━━━━━━━━━━

  PostCard.tsx
  ├─ GET /api/agent-posts/${postId}/comments  ✅ Correct endpoint
  ├─ transformCommentsArray(data.data)        ✅ Add aliases
  └─ setComments(transformed)                 ✅ Both formats

  ↓ Pass to child

  CommentThread.tsx
  ├─ Receives: {
  │    created_at: "...",     ✅ Original
  │    createdAt: "..."       ✅ Alias added
  │  }
  └─ Uses: comment.created_at || comment.createdAt  ✅ Fallback works
      formatTimestamp(valid date)                    ✅ "5m ago"

  Result: Comments show proper relative timestamps
```

---

## Implementation Checklist

### Critical Path (Must Fix)
- [ ] Fix PostCard.tsx endpoint (line 101)
- [ ] Test comment loading works
- [ ] Verify replies appear in thread

### Enhancement Path (Should Fix)
- [ ] Add transformCommentDates() utility
- [ ] Apply transformation in loadComments()
- [ ] Test timestamp display
- [ ] Verify both date formats work

### Optional Path (Nice to Have)
- [ ] Add error logging
- [ ] Add performance monitoring
- [ ] Add E2E tests
- [ ] Document API contract

---

## Success Metrics

### Functional Success
```
✅ Comments load successfully (endpoint fix)
✅ Timestamps display correctly (not "invalid date")
✅ Replies appear in correct thread position
✅ No console errors
✅ No breaking changes to existing features
```

### Performance Success
```
✅ No measurable performance degradation
✅ Transformation overhead < 1ms per 100 comments
✅ Memory increase < 1KB per 100 comments
```

### Quality Success
```
✅ Code coverage > 80% for new functions
✅ Zero TypeScript errors
✅ Zero ESLint warnings
✅ Passes all existing tests
```

---

## Architecture Decisions Record

### ADR-001: Dual-Field Support
**Decision**: Maintain both snake_case and camelCase fields
**Rationale**: Ensures backward compatibility, no breaking changes
**Alternatives**:
  - Replace snake_case with camelCase (breaking)
  - Normalize at API level (requires backend changes)

### ADR-002: Transformation Layer Location
**Decision**: Transform at component load time (PostCard)
**Rationale**: Centralized, runs once per load, before child components
**Alternatives**:
  - Transform in CommentThread (too late, already broken)
  - Transform in API service (better, but requires more changes)

### ADR-003: Endpoint Fix Strategy
**Decision**: Fix endpoint URL in PostCard.tsx
**Rationale**: Single-line change, low risk, immediate fix
**Alternatives**:
  - Add route alias on backend (unnecessary complexity)
  - Create API wrapper (overkill for simple fix)

---

## Conclusion

This architecture provides a **minimal, low-risk solution** to fix comment reply display issues:

**Two-Line Fix**:
1. Change endpoint: `/api/v1/posts/` → `/api/agent-posts/`
2. Add transformation: `transformCommentDates(comment)`

**Benefits**:
- ✅ Backward compatible
- ✅ No API changes needed
- ✅ Fixes both issues simultaneously
- ✅ Defensive programming (handles both formats)
- ✅ Low performance overhead

**Risk Assessment**: **LOW**
- Additive changes only
- No breaking changes
- Falls back gracefully
- Already tested pattern (CommentThread uses this approach)

---

**Next Phase**: Refinement (Implementation)
**Architecture Status**: ✅ Complete
**Ready for Development**: Yes

