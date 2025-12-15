# SPARC Specification: CommentThread Reply Functionality Fix

## Document Information
- **Version**: 1.0.0
- **Date**: 2025-10-27
- **Status**: Draft
- **SPARC Phase**: Specification
- **Component**: Frontend CommentThread Component

---

## 1. Executive Summary

### 1.1 Problem Statement
The CommentThread.tsx component has a hardcoded API endpoint for posting replies that does not exist in the backend. Line 574 calls `POST /api/v1/comments/:parentId/reply`, but the backend only provides `POST /api/agent-posts/:postId/comments` with a `parent_id` field.

### 1.2 Current Impact
- **Severity**: Critical (P0)
- **User Impact**: Reply functionality is completely broken (404 errors)
- **Affected Features**: All comment threading/reply operations
- **Error Type**: HTTP 404 - Endpoint not found

### 1.3 Proposed Solution
Replace the hardcoded API call in `handleReply` function with the existing `useCommentThreading` hook, which already implements the correct API integration pattern.

### 1.4 Success Criteria
- Reply button posts comments to correct backend endpoint
- Parent-child comment relationships preserved
- No breaking changes to existing functionality
- Thread depth and hierarchy maintained
- Error handling improved

---

## 2. Current State Analysis

### 2.1 Component Architecture

**File**: `/workspaces/agent-feed/frontend/src/components/CommentThread.tsx`

**Current Flow**:
```
User clicks Reply → setIsReplying(true) → User types content →
handleReplySubmit() → handleReply(comment.id, content) →
fetch('/api/v1/comments/:parentId/reply') → 404 ERROR
```

**Problem Location**: Lines 571-594
```typescript
const handleReply = useCallback(async (parentId: string, content: string) => {
  setIsLoading(true);
  try {
    const response = await fetch(`/api/v1/comments/${parentId}/reply`, {  // ❌ WRONG ENDPOINT
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        authorAgent: currentUser,
        postId: postId
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create reply');
    }

    onCommentsUpdate?.();
  } finally {
    setIsLoading(false);
  }
}, [postId, currentUser, onCommentsUpdate]);
```

### 2.2 Backend API Contract

**Actual Endpoint**: `/api/agent-posts/:postId/comments`

**Location**: `/workspaces/agent-feed/api-server/server.js` (Lines 1575-1671)

**Request Schema**:
```typescript
POST /api/agent-posts/:postId/comments
Headers: {
  'Content-Type': 'application/json',
  'x-user-id': string (optional, defaults to 'anonymous')
}
Body: {
  content: string (required, trimmed, max length TBD),
  author?: string (backward compatibility),
  author_agent?: string (primary field),
  parent_id?: string | null (for replies),
  mentioned_users?: string[] (for @mentions)
}
```

**Response Schema**:
```typescript
{
  success: true,
  data: {
    id: string (UUID),
    post_id: string,
    content: string,
    author: string,
    author_agent: string,
    parent_id: string | null,
    mentioned_users: string[],
    depth: number,
    created_at: string (ISO timestamp),
    updated_at: string (ISO timestamp)
  },
  ticket: {
    id: string,
    status: string
  } | null,
  message: string,
  source: 'PostgreSQL' | 'SQLite'
}
```

**Error Response**:
```typescript
{
  success: false,
  error: string,
  details?: string
}
```

### 2.3 Existing Hook Implementation

**File**: `/workspaces/agent-feed/frontend/src/hooks/useCommentThreading.ts`

**Correct Implementation** (Lines 273-362):
```typescript
const addComment = useCallback(async (
  content: string,
  parentId?: string
): Promise<CommentTreeNode> => {
  // ... optimistic update logic ...

  const response = await axios.post(
    `${API_BASE_URL}/agent-posts/${postId}/comments`,  // ✅ CORRECT ENDPOINT
    {
      content,
      author: 'anonymous',
      parent_id: parentId || null  // ✅ CORRECT FIELD
    },
    { timeout: 10000 }
  );

  // ... response handling ...
}, [postId, API_BASE_URL]);
```

**Hook Features**:
- ✅ Correct API endpoint integration
- ✅ Optimistic updates for better UX
- ✅ Error handling and retry logic
- ✅ Tree structure management
- ✅ State synchronization
- ✅ Statistics tracking

### 2.4 Component vs Hook Comparison

| Feature | Current Component | useCommentThreading Hook |
|---------|------------------|-------------------------|
| API Endpoint | ❌ `/api/v1/comments/:parentId/reply` | ✅ `/api/agent-posts/:postId/comments` |
| Request Body | ❌ `authorAgent` field | ✅ `author_agent` or `author` |
| Parent Field | ❌ URL parameter | ✅ `parent_id` in body |
| Error Handling | ⚠️ Basic try-catch | ✅ Comprehensive with retry |
| Optimistic Updates | ❌ None | ✅ Implemented |
| Loading States | ⚠️ Local only | ✅ Centralized |
| State Management | ⚠️ Props callback | ✅ Hook state |

---

## 3. Functional Requirements

### FR-1.0 Reply Functionality

#### FR-1.1 Core Reply Operation
- **FR-1.1.1**: Component MUST use `useCommentThreading` hook for all comment operations
- **FR-1.1.2**: Reply submission MUST call `addComment(content, parentId)` from hook
- **FR-1.1.3**: Parent comment ID MUST be passed as second parameter to `addComment`
- **FR-1.1.4**: Component MUST remove custom `handleReply` implementation

#### FR-1.2 Request Handling
- **FR-1.2.1**: Request MUST use POST `/api/agent-posts/:postId/comments`
- **FR-1.2.2**: Request body MUST include `parent_id` field (not URL parameter)
- **FR-1.2.3**: Request body MUST use `author` or `author_agent` field (not `authorAgent`)
- **FR-1.2.4**: Content MUST be trimmed and validated before submission

#### FR-1.3 User Experience
- **FR-1.3.1**: Component MUST show optimistic update (immediate UI feedback)
- **FR-1.3.2**: Component MUST disable reply button during submission
- **FR-1.3.3**: Component MUST show loading state during submission
- **FR-1.3.4**: Reply form MUST clear on successful submission
- **FR-1.3.5**: Reply form MUST close on successful submission

#### FR-1.4 Error Handling
- **FR-1.4.1**: Component MUST display user-friendly error messages
- **FR-1.4.2**: Component MUST preserve user input on error
- **FR-1.4.3**: Component MUST allow retry after error
- **FR-1.4.4**: Component MUST handle network timeouts gracefully
- **FR-1.4.5**: Component MUST remove optimistic update on error

### FR-2.0 State Management

#### FR-2.1 Hook Integration
- **FR-2.1.1**: Component MUST initialize `useCommentThreading` hook with `postId`
- **FR-2.1.2**: Component MUST use hook's `comments` state instead of props
- **FR-2.1.3**: Component MUST use hook's `loading` state for UI feedback
- **FR-2.1.4**: Component MUST use hook's `error` state for error display

#### FR-2.2 Data Synchronization
- **FR-2.2.1**: Component MUST refresh comment tree after successful reply
- **FR-2.2.2**: New replies MUST appear in correct thread position
- **FR-2.2.3**: Thread depth calculations MUST remain accurate
- **FR-2.2.4**: Reply counts MUST update automatically

### FR-3.0 Backward Compatibility

#### FR-3.1 Props Interface
- **FR-3.1.1**: Component MUST maintain existing props interface
- **FR-3.1.2**: `comments` prop MAY become optional (hook provides data)
- **FR-3.1.3**: `onCommentsUpdate` callback MUST still be supported
- **FR-3.1.4**: All existing props MUST work without changes

#### FR-3.2 Component Behavior
- **FR-3.2.1**: Navigation features MUST continue working
- **FR-3.2.2**: Expand/collapse functionality MUST not be affected
- **FR-3.2.3**: Highlighting MUST continue working
- **FR-3.2.4**: Moderation features MUST remain functional

---

## 4. Non-Functional Requirements

### NFR-1.0 Performance

#### NFR-1.1 Response Time
- **NFR-1.1.1**: Reply submission SHOULD complete within 2 seconds (p95)
- **NFR-1.1.2**: Optimistic update MUST appear within 100ms
- **NFR-1.1.3**: Comment tree rebuild SHOULD complete within 500ms

#### NFR-1.2 Resource Usage
- **NFR-1.2.1**: Component MUST not cause memory leaks
- **NFR-1.2.2**: Event listeners MUST be cleaned up on unmount
- **NFR-1.2.3**: AbortController MUST cancel pending requests on unmount

### NFR-2.0 Reliability

#### NFR-2.1 Error Recovery
- **NFR-2.1.1**: Failed requests SHOULD retry automatically (network errors only)
- **NFR-2.1.2**: Maximum 3 retry attempts with exponential backoff
- **NFR-2.1.3**: Component MUST handle partial failures gracefully

#### NFR-2.2 Data Integrity
- **NFR-2.2.1**: Parent-child relationships MUST always be correct
- **NFR-2.2.2**: Thread depth MUST never exceed `maxDepth` setting
- **NFR-2.2.3**: Comment IDs MUST be unique and stable

### NFR-3.0 Maintainability

#### NFR-3.1 Code Quality
- **NFR-3.1.1**: Code MUST follow existing TypeScript patterns
- **NFR-3.1.2**: Functions MUST have clear single responsibilities
- **NFR-3.1.3**: Magic values MUST be avoided (use constants)
- **NFR-3.1.4**: Complex logic MUST have inline comments

#### NFR-3.2 Testing
- **NFR-3.2.1**: Changes MUST not break existing tests
- **NFR-3.2.2**: New functionality SHOULD have unit tests
- **NFR-3.2.3**: Integration tests SHOULD verify hook integration

### NFR-4.0 Security

#### NFR-4.1 Input Validation
- **NFR-4.1.1**: Content MUST be validated client-side before submission
- **NFR-4.1.2**: XSS prevention MUST be maintained
- **NFR-4.1.3**: Content length MUST be enforced (2000 character limit)

#### NFR-4.2 Authentication
- **NFR-4.2.1**: User identity MUST be passed to backend
- **NFR-4.2.2**: Anonymous users MUST be supported
- **NFR-4.2.3**: Author field MUST match authenticated user

---

## 5. API Contract Specification

### 5.1 Comment Creation Endpoint

**Endpoint**: `POST /api/agent-posts/:postId/comments`

**Path Parameters**:
```typescript
{
  postId: string // UUID of parent post
}
```

**Headers**:
```typescript
{
  'Content-Type': 'application/json',
  'x-user-id'?: string // Optional, defaults to 'anonymous'
}
```

**Request Body**:
```typescript
{
  content: string,          // Required, trimmed, non-empty
  author?: string,          // Optional, backward compatibility
  author_agent?: string,    // Optional, primary author field
  parent_id?: string | null, // Optional, for replies (null for root comments)
  mentioned_users?: string[], // Optional, @mention support
  skipTicket?: boolean      // Optional, internal flag (default: false)
}
```

**Success Response** (201 Created):
```typescript
{
  success: true,
  data: {
    id: string,                // UUID
    post_id: string,           // UUID
    content: string,
    author: string,
    author_agent: string,
    parent_id: string | null,
    mentioned_users: string[],
    depth: number,
    thread_depth?: number,
    thread_path?: string,
    reply_count?: number,
    created_at: string,       // ISO 8601 timestamp
    updated_at: string        // ISO 8601 timestamp
  },
  ticket: {
    id: string,
    status: string
  } | null,
  message: 'Comment created successfully',
  source: 'PostgreSQL' | 'SQLite'
}
```

**Error Responses**:

*400 Bad Request*:
```typescript
{
  success: false,
  error: 'Content is required' | 'Author or author_agent is required'
}
```

*500 Internal Server Error*:
```typescript
{
  success: false,
  error: 'Failed to create comment',
  details: string
}
```

### 5.2 Field Mappings

| Frontend Field | Backend Field | Required | Default | Notes |
|---------------|---------------|----------|---------|-------|
| `content` | `content` | Yes | - | Trimmed, non-empty |
| `currentUser` | `author_agent` | Yes | 'anonymous' | Author identity |
| `parentId` | `parent_id` | No | null | For replies only |
| - | `post_id` | Yes | - | From URL param |
| - | `depth` | No | 0 | Calculated by backend |

### 5.3 Validation Rules

**Client-side** (Frontend):
```typescript
{
  content: {
    minLength: 1,
    maxLength: 2000,
    trim: true,
    required: true
  },
  parentId: {
    format: 'uuid',
    nullable: true
  }
}
```

**Server-side** (Backend):
```typescript
{
  content: {
    trim: true,
    required: true,
    message: 'Content is required'
  },
  author_agent: {
    trim: true,
    required: true,
    fallback: 'anonymous',
    message: 'Author or author_agent is required'
  }
}
```

---

## 6. Component Integration Requirements

### 6.1 Hook Initialization

**Current Props**:
```typescript
interface CommentThreadProps {
  postId: string;
  comments: Comment[];          // ⚠️ Will become optional
  currentUser?: string;
  maxDepth?: number;
  onCommentsUpdate?: () => void;
  showModeration?: boolean;
  enableRealTime?: boolean;
  className?: string;
}
```

**Hook Integration**:
```typescript
const CommentThread: React.FC<CommentThreadProps> = ({
  postId,
  comments: propComments,    // Rename to avoid conflict
  currentUser = 'current-user',
  maxDepth = 6,
  onCommentsUpdate,
  showModeration = false,
  enableRealTime = false,
  className
}) => {
  // Initialize hook
  const {
    comments: hookComments,
    loading: hookLoading,
    error: hookError,
    addComment,
    refreshComments
  } = useCommentThreading(postId, {
    initialComments: [], // Hook manages data
    maxDepth,
    autoRefresh: enableRealTime,
    refreshInterval: 30000
  });

  // Use hook comments if available, fall back to props
  const comments = hookComments.length > 0 ? hookComments : propComments;

  // ... rest of component
};
```

### 6.2 Reply Handler Replacement

**BEFORE** (Lines 571-594):
```typescript
const handleReply = useCallback(async (parentId: string, content: string) => {
  setIsLoading(true);
  try {
    const response = await fetch(`/api/v1/comments/${parentId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        authorAgent: currentUser,
        postId: postId
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create reply');
    }

    onCommentsUpdate?.();
  } finally {
    setIsLoading(false);
  }
}, [postId, currentUser, onCommentsUpdate]);
```

**AFTER**:
```typescript
const handleReply = useCallback(async (parentId: string, content: string) => {
  try {
    // Use hook's addComment method with parent_id
    await addComment(content, parentId);

    // Call optional callback for backward compatibility
    onCommentsUpdate?.();
  } catch (error) {
    // Error already handled by hook
    console.error('Reply failed:', error);
    throw error; // Re-throw for component error display
  }
}, [addComment, onCommentsUpdate]);
```

**Changes**:
1. ❌ Remove `setIsLoading` calls (hook manages loading state)
2. ❌ Remove manual fetch call
3. ✅ Call `addComment(content, parentId)` from hook
4. ✅ Keep `onCommentsUpdate` callback for compatibility
5. ✅ Simplify error handling (hook handles details)

### 6.3 Loading State Management

**BEFORE**:
```typescript
const [isLoading, setIsLoading] = useState(false);
```

**AFTER**:
```typescript
// Use hook's loading state
const { loading: hookLoading } = useCommentThreading(postId);
const isLoading = hookLoading; // Or use directly
```

### 6.4 Error Display

**Add error display**:
```typescript
const { error: hookError } = useCommentThreading(postId);

// In JSX
{hookError && (
  <div className="p-4 bg-red-50 border border-red-200 rounded">
    <p className="text-red-600 text-sm">{hookError}</p>
    <button onClick={refreshComments} className="text-red-700 underline">
      Retry
    </button>
  </div>
)}
```

---

## 7. Testing Requirements

### 7.1 Unit Tests

#### Test Suite: `CommentThread.test.tsx`

**Test Cases**:
```typescript
describe('CommentThread Reply Functionality', () => {
  test('should call addComment with correct parameters on reply', async () => {
    // Arrange
    const mockAddComment = jest.fn();
    const { getByText, getByPlaceholderText } = render(
      <CommentThread postId="post-123" />
    );

    // Act
    fireEvent.click(getByText('Reply'));
    fireEvent.change(getByPlaceholderText(/write a reply/i), {
      target: { value: 'Test reply content' }
    });
    fireEvent.click(getByText('Post Reply'));

    // Assert
    await waitFor(() => {
      expect(mockAddComment).toHaveBeenCalledWith(
        'Test reply content',
        'parent-comment-id'
      );
    });
  });

  test('should show loading state during reply submission', async () => {
    // ... test implementation
  });

  test('should display error message on reply failure', async () => {
    // ... test implementation
  });

  test('should clear form on successful reply', async () => {
    // ... test implementation
  });

  test('should preserve input on reply error', async () => {
    // ... test implementation
  });
});
```

### 7.2 Integration Tests

#### Test Suite: `comment-reply-integration.test.ts`

**Test Cases**:
```typescript
describe('Comment Reply API Integration', () => {
  test('should create reply with correct API endpoint', async () => {
    // Test actual API call to POST /api/agent-posts/:postId/comments
  });

  test('should include parent_id in request body', async () => {
    // Verify parent_id field is sent correctly
  });

  test('should update comment tree after successful reply', async () => {
    // Verify UI updates with new comment
  });

  test('should handle 404 errors gracefully', async () => {
    // Ensure old endpoint errors are handled
  });

  test('should handle network timeouts', async () => {
    // Test timeout handling
  });
});
```

### 7.3 Manual Testing Checklist

**Pre-deployment Testing**:
- [ ] Reply button is visible on comments
- [ ] Reply form opens when button clicked
- [ ] Typing in reply form works
- [ ] Character counter updates correctly
- [ ] Submit button disabled when content empty
- [ ] Submit button shows loading state
- [ ] Reply appears in correct thread position
- [ ] Reply form clears on success
- [ ] Error message displays on failure
- [ ] Input preserved on error
- [ ] Retry works after error
- [ ] Thread depth respected
- [ ] Parent comment ID correct
- [ ] Network errors handled gracefully
- [ ] Multiple rapid replies work correctly

### 7.4 Acceptance Criteria

**Definition of Done**:
1. ✅ All unit tests pass
2. ✅ All integration tests pass
3. ✅ Manual testing checklist completed
4. ✅ No console errors in browser
5. ✅ No regression in existing functionality
6. ✅ Code review approved
7. ✅ Documentation updated
8. ✅ Performance benchmarks met

---

## 8. Success Criteria

### 8.1 Functional Success

**Must Have**:
- ✅ Reply button creates comment with correct API endpoint
- ✅ Parent-child relationships preserved in database
- ✅ New replies appear in UI immediately (optimistic)
- ✅ Error messages clear and actionable
- ✅ No breaking changes to existing features

**Should Have**:
- ✅ Optimistic updates provide instant feedback
- ✅ Loading states clear and consistent
- ✅ Retry logic for network errors
- ✅ Graceful degradation on errors

**Nice to Have**:
- ⭐ Offline support with queue
- ⭐ Real-time updates via WebSocket
- ⭐ Advanced error analytics

### 8.2 Technical Success

**Code Quality**:
- ✅ TypeScript strict mode compliance
- ✅ No linting errors or warnings
- ✅ Consistent code style
- ✅ Clear variable and function names
- ✅ Adequate inline comments

**Performance**:
- ✅ Reply submission < 2s (p95)
- ✅ Optimistic update < 100ms
- ✅ Tree rebuild < 500ms
- ✅ No memory leaks
- ✅ Efficient re-renders

**Maintainability**:
- ✅ Single responsibility functions
- ✅ Clear separation of concerns
- ✅ Reusable patterns
- ✅ Comprehensive comments
- ✅ Easy to test

### 8.3 User Experience Success

**Usability**:
- ✅ Reply flow intuitive and smooth
- ✅ Errors don't cause data loss
- ✅ Loading states don't block interaction
- ✅ Visual feedback immediate
- ✅ Keyboard navigation works

**Accessibility**:
- ✅ Screen reader compatible
- ✅ Keyboard accessible
- ✅ Focus management correct
- ✅ ARIA labels present
- ✅ Color contrast sufficient

---

## 9. Implementation Strategy

### 9.1 Approach Selection

**Option A: Minimal Change (RECOMMENDED)**
- Replace `handleReply` implementation only
- Keep existing component structure
- Use hook for API calls
- **Pros**: Low risk, quick implementation, backward compatible
- **Cons**: Doesn't leverage full hook capabilities

**Option B: Full Hook Integration**
- Refactor component to use hook entirely
- Remove props.comments dependency
- Centralize all state in hook
- **Pros**: Best practices, future-proof, cleaner architecture
- **Cons**: Higher risk, more testing needed, potential breaking changes

**Option C: Hybrid Approach (SELECTED)**
- Use hook for data fetching and mutations
- Maintain props for backward compatibility
- Gradual migration path
- **Pros**: Balance of safety and improvement
- **Cons**: Temporary code duplication

### 9.2 Migration Path

**Phase 1: Hook Integration** (This Spec)
1. Initialize `useCommentThreading` hook
2. Replace `handleReply` with `addComment`
3. Use hook loading/error states
4. Maintain props compatibility

**Phase 2: State Migration** (Future)
1. Deprecate `comments` prop
2. Use hook as source of truth
3. Remove redundant state
4. Simplify component

**Phase 3: Full Optimization** (Future)
1. Remove backward compatibility layer
2. Optimize re-renders
3. Add advanced features
4. Performance tuning

### 9.3 Risk Mitigation

**Risks**:
1. **Breaking changes**: Props interface changes
   - **Mitigation**: Keep all props optional, gradual deprecation

2. **Performance regression**: Extra hook overhead
   - **Mitigation**: Benchmark before/after, optimize if needed

3. **State synchronization**: Props vs hook conflicts
   - **Mitigation**: Clear priority (hook > props), testing

4. **Existing code dependencies**: Other components rely on props
   - **Mitigation**: Maintain backward compatibility, phased rollout

### 9.4 Rollback Plan

**If Issues Occur**:
1. Revert to previous `handleReply` implementation
2. Add feature flag for new implementation
3. Gradual rollout to subset of users
4. Monitor error rates and user feedback
5. Fix issues before full deployment

---

## 10. Dependencies and Constraints

### 10.1 Technical Dependencies

**Frontend**:
- React 18+
- TypeScript 4.5+
- axios (for HTTP requests)
- useCommentThreading hook

**Backend**:
- Express.js server
- PostgreSQL or SQLite database
- `/api/agent-posts/:postId/comments` endpoint

**Build Tools**:
- Vite or webpack
- TypeScript compiler
- Jest (testing)

### 10.2 Constraints

**Technical**:
- Must maintain TypeScript strict mode
- Must work with existing database schema
- Must not change API contract
- Must support both PostgreSQL and SQLite

**Business**:
- Zero downtime deployment required
- Backward compatibility essential
- No breaking changes allowed
- Performance must not degrade

**Timeline**:
- Specification: 1 day
- Implementation: 2-3 days
- Testing: 2 days
- Review and deployment: 1 day
- **Total**: 6-7 days

### 10.3 Assumptions

**Technical Assumptions**:
1. Backend API endpoint is stable and working
2. useCommentThreading hook is production-ready
3. TypeScript types are accurate
4. Database schema supports threading

**Business Assumptions**:
1. Reply functionality is high priority
2. Users expect immediate feedback
3. Error recovery is acceptable
4. Optimistic updates are desired

---

## 11. Data Model Specification

### 11.1 Comment Entity

```typescript
interface Comment {
  // Core fields
  id: string;                    // UUID, primary key
  post_id: string;              // UUID, foreign key to posts
  content: string;              // Comment text content

  // Author fields
  author: string;               // Legacy field
  author_agent: string;         // Primary author identifier
  author_type?: 'agent' | 'user' | 'system';

  // Threading fields
  parent_id: string | null;     // UUID of parent comment (null for root)
  depth: number;                // Thread depth (0 for root)
  thread_depth?: number;        // Alternative depth field
  thread_path?: string;         // Materialized path for efficient queries

  // Engagement fields
  reply_count?: number;         // Number of direct replies
  like_count?: number;          // Number of likes
  reaction_count?: number;      // Total reactions

  // Metadata fields
  mentioned_users?: string[];   // Array of @mentioned user IDs
  is_agent_response?: boolean;  // Flag for agent-generated comments
  conversation_thread_id?: string; // Conversation tracking
  quality_score?: number;       // Comment quality metric

  // Status fields
  status?: 'published' | 'pending' | 'deleted' | 'moderated';
  is_deleted?: boolean;         // Soft delete flag
  is_edited?: boolean;          // Edit flag
  is_moderated?: boolean;       // Moderation flag

  // Timestamps
  created_at: string;           // ISO 8601 timestamp
  updated_at: string;           // ISO 8601 timestamp
  edited_at?: string;           // Last edit timestamp
}
```

### 11.2 Tree Structure

```typescript
interface CommentTreeNode {
  // Comment data
  id: string;
  content: string;
  contentType: 'text' | 'markdown' | 'html';

  // Author info
  author: {
    type: 'agent' | 'user' | 'system';
    id: string;
    name: string;
    avatar: string;
  };

  // Metadata
  metadata: {
    threadDepth: number;
    threadPath: string;
    replyCount: number;
    likeCount: number;
    reactionCount: number;
    isAgentResponse: boolean;
    responseToAgent?: string;
    conversationThreadId?: string;
    qualityScore?: number;
  };

  // Engagement
  engagement: {
    likes: number;
    reactions: Record<string, number>;
    userReacted: boolean;
    userReactionType?: string;
  };

  // Status
  status: 'published' | 'pending' | 'deleted' | 'moderated';

  // Tree structure
  children: CommentTreeNode[];

  // Timestamps
  createdAt: string;
  updatedAt: string;
}
```

### 11.3 Thread Hierarchy Rules

**Depth Calculation**:
```typescript
// Root comment (no parent)
depth = 0

// Reply to root comment
depth = parent.depth + 1

// Maximum depth enforcement
if (depth >= maxDepth) {
  // Prevent nesting, attach to last valid depth
}
```

**Thread Path**:
```typescript
// Materialized path for efficient queries
// Format: "root_id.parent_id.comment_id"

// Root comment
thread_path = "comment_id"

// Child comment
thread_path = parent.thread_path + ".comment_id"

// Example
// Root: "comment-1"
// Reply: "comment-1.comment-2"
// Reply to reply: "comment-1.comment-2.comment-3"
```

---

## 12. Validation Checklist

Before completing specification, verify:

- [✅] All requirements are testable and measurable
- [✅] Acceptance criteria are clear and objective
- [✅] Edge cases are documented and handled
- [✅] Performance metrics are defined with targets
- [✅] Security requirements are specified
- [✅] Dependencies are identified and available
- [✅] Constraints are documented and realistic
- [✅] API contract is complete and accurate
- [✅] Data models are well-defined
- [✅] Error scenarios are covered
- [✅] Success criteria are achievable
- [✅] Testing strategy is comprehensive
- [✅] Implementation approach is sound
- [✅] Risks are identified with mitigations
- [✅] Rollback plan exists

---

## 13. Appendices

### Appendix A: File Locations

```
/workspaces/agent-feed/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── CommentThread.tsx          [MODIFY]
│   │   ├── hooks/
│   │   │   └── useCommentThreading.ts     [USE]
│   │   └── utils/
│   │       └── commentUtils.ts            [REFERENCE]
│   └── tests/
│       └── components/
│           └── CommentThread.test.tsx     [CREATE/UPDATE]
├── api-server/
│   └── server.js                          [REFERENCE - Lines 1575-1671]
└── docs/
    └── SPARC-COMMENTTHREAD-FIX-SPEC.md   [THIS FILE]
```

### Appendix B: Related Documentation

- `/workspaces/agent-feed/docs/SPARC-COMMENT-HOOKS-SPEC.md` - Comment hooks specification
- `/workspaces/agent-feed/docs/SPARC-COMMENT-HOOKS-ARCHITECTURE.md` - Architecture design
- `/workspaces/agent-feed/docs/COMMENT-HOOKS-IMPLEMENTATION.md` - Implementation guide

### Appendix C: API Endpoint Comparison

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/v1/comments/:parentId/reply` | POST | Create reply | ❌ DOES NOT EXIST |
| `/api/agent-posts/:postId/comments` | POST | Create comment/reply | ✅ WORKING |
| `/api/agent-posts/:postId/comments` | GET | List comments | ✅ WORKING |
| `/api/comments/:commentId` | PUT | Update comment | ✅ WORKING |
| `/api/comments/:commentId` | DELETE | Delete comment | ✅ WORKING |

### Appendix D: Change Summary

**Files to Modify**:
1. `/workspaces/agent-feed/frontend/src/components/CommentThread.tsx`
   - Initialize `useCommentThreading` hook
   - Replace `handleReply` implementation
   - Update loading state handling
   - Add error display

**Files to Create**:
1. `/workspaces/agent-feed/frontend/tests/components/CommentThread.test.tsx`
   - Unit tests for reply functionality

**Files to Reference**:
1. `/workspaces/agent-feed/frontend/src/hooks/useCommentThreading.ts`
   - Hook API documentation
2. `/workspaces/agent-feed/api-server/server.js`
   - Backend API contract

---

## Document Approval

| Role | Name | Date | Status |
|------|------|------|--------|
| Specification Author | SPARC Agent | 2025-10-27 | ✅ Complete |
| Technical Review | Pending | - | ⏳ Pending |
| Architecture Review | Pending | - | ⏳ Pending |
| Product Owner | Pending | - | ⏳ Pending |

---

**End of Specification**
