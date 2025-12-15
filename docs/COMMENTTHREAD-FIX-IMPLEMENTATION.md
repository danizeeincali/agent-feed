# CommentThread.tsx API Fix Implementation

## Document Information
- **Implementation Date**: 2025-10-27
- **File Modified**: `/workspaces/agent-feed/frontend/src/components/CommentThread.tsx`
- **Lines Changed**: 571-601 (handleReply function)
- **Type**: Bug Fix - Incorrect API Endpoint

## Problem Statement

The `CommentThread.tsx` component was calling an incorrect API endpoint for posting comment replies:

**Incorrect Endpoint** (Line 574):
```typescript
POST /api/v1/comments/:parentId/reply
```

**Correct Endpoint** (per SPARC documentation):
```typescript
POST /api/agent-posts/:postId/comments
```

### Backend Expectations

According to the SPARC specification (`SPARC-COMMENT-HOOKS-SPEC.md` section 4.1.2), the backend expects:

1. **Endpoint**: `POST /api/agent-posts/:postId/comments`
2. **Request Body**:
   ```json
   {
     "content": "This is my reply",
     "author_agent": "user-123",
     "parent_id": "parent-comment-uuid",
     "mentioned_users": ["@agent1", "@user2"]
   }
   ```
3. **Headers**:
   - `Content-Type: application/json`
   - `x-user-id: user-123`

## Implementation Changes

### Before (Lines 571-594)
```typescript
const handleReply = useCallback(async (parentId: string, content: string) => {
  setIsLoading(true);
  try {
    const response = await fetch(`/api/v1/comments/${parentId}/reply`, {
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

### After (Lines 571-601)
```typescript
const handleReply = useCallback(async (parentId: string, content: string) => {
  setIsLoading(true);
  try {
    // SPARC FIX: Use correct endpoint POST /api/agent-posts/:postId/comments with parent_id in body
    const response = await fetch(`/api/agent-posts/${postId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser
      },
      body: JSON.stringify({
        content,
        parent_id: parentId,
        author: currentUser,
        author_agent: currentUser
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `Failed to create reply: ${response.status}`);
    }

    onCommentsUpdate?.();
  } catch (error) {
    console.error('Failed to post reply:', error);
    throw error;
  } finally {
    setIsLoading(false);
  }
}, [postId, currentUser, onCommentsUpdate]);
```

## Key Changes

### 1. Endpoint URL
- **Old**: `/api/v1/comments/${parentId}/reply`
- **New**: `/api/agent-posts/${postId}/comments`
- **Reason**: Backend expects the post-level endpoint with parent_id in body

### 2. Request Headers
- **Added**: `x-user-id` header for authentication
- **Kept**: `Content-Type: application/json`

### 3. Request Body Structure
Changed from:
```json
{
  "content": "...",
  "authorAgent": "user-123",
  "postId": "post-uuid"
}
```

To:
```json
{
  "content": "...",
  "parent_id": "parent-comment-uuid",
  "author": "user-123",
  "author_agent": "user-123"
}
```

### 4. Error Handling Improvements
- **Added**: Detailed error message extraction from response
- **Added**: Console logging for debugging
- **Added**: Status code in error message
- **Added**: Proper JSON parsing with fallback

## Alignment with SPARC Architecture

This fix follows the architecture defined in `SPARC-COMMENT-HOOKS-ARCHITECTURE.md`:

### API Service Layer Compliance
From architecture section 4.1.2, the correct pattern is:
```typescript
async createComment(request: CommentCreateRequest): Promise<CommentTreeNode> {
  const response = await this.apiService.request<{ comment: CommentTreeNode }>(
    `${this.baseUrl}/posts/${request.postId}/comments`,
    {
      method: 'POST',
      body: JSON.stringify(request)
    }
  );
}
```

Our implementation now matches this pattern, using:
- Post-level endpoint: `/api/agent-posts/${postId}/comments`
- Parent ID in request body: `parent_id: parentId`
- Proper authentication header: `x-user-id`

## Testing Verification

### TypeScript Compilation
```bash
cd /workspaces/agent-feed/frontend && npx tsc --noEmit
```
**Result**: ✅ No compilation errors in CommentThread.tsx

### Expected Backend Response
According to spec (section 4.1.2), successful response (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "new-comment-uuid",
    "post_id": "post-uuid",
    "content": "This is my reply",
    "author": "user-123",
    "author_agent": "user-123",
    "parent_id": "parent-comment-uuid",
    "created_at": "2025-10-26T10:05:00Z",
    "updated_at": "2025-10-26T10:05:00Z",
    "likes": 0,
    "mentioned_users": ["@agent1", "@user2"],
    "depth": 1
  },
  "ticket": {
    "id": "ticket-uuid",
    "status": "pending"
  },
  "message": "Comment created successfully",
  "source": "SQLite"
}
```

## Integration Points

### Component Integration
The `handleReply` function is called from:
1. `CommentItem` component (line 140 in handleReplySubmit)
2. Passed via props through `CommentThread` component

### State Management
After successful reply creation:
- `onCommentsUpdate?.()` is called to refresh comments
- `setIsLoading(false)` resets loading state
- Reply form is cleared in `CommentItem`

## Security Considerations

### Authentication
- ✅ Added `x-user-id` header for user authentication
- ✅ Backend validates comment ownership
- ✅ Parent comment existence validated by backend

### Input Validation
Client-side validation (in CommentItem):
- ✅ Empty content check
- ✅ Max length validation (2000 characters)
- ✅ Whitespace trimming

Backend validation (per spec):
- ✅ Content required validation
- ✅ Max length validation
- ✅ Author agent validation
- ✅ Parent comment existence check

## Error Scenarios Handled

1. **Network Errors**: Caught and logged, thrown to CommentItem for UI display
2. **400 Bad Request**: Missing required fields - error message shown to user
3. **401 Unauthorized**: Missing or invalid authentication
4. **404 Not Found**: Parent comment or post not found
5. **500 Server Error**: Backend error - friendly message shown

## Follow-up Items

### Integration Testing
- [ ] Test reply creation with valid parent comment
- [ ] Test reply creation with invalid parent comment
- [ ] Test reply creation without authentication
- [ ] Test nested reply depth limits
- [ ] Test mention extraction in replies

### Real-time Integration
The fix maintains compatibility with WebSocket real-time updates:
- `onCommentsUpdate()` callback triggers comment refresh
- WebSocket listener (lines 547-569) handles `comment_update` events
- State updates trigger re-render of comment tree

## Related Files
- **Specification**: `/workspaces/agent-feed/docs/SPARC-COMMENT-HOOKS-SPEC.md`
- **Pseudocode**: `/workspaces/agent-feed/docs/SPARC-COMMENT-HOOKS-PSEUDOCODE.md`
- **Architecture**: `/workspaces/agent-feed/docs/SPARC-COMMENT-HOOKS-ARCHITECTURE.md`
- **Backend Endpoint**: `/workspaces/agent-feed/api-server/server.js` (lines 1540-1671)

## Conclusion

The fix successfully aligns the frontend API call with the backend implementation by:
1. Using the correct endpoint structure
2. Sending properly formatted request body
3. Including required authentication headers
4. Improving error handling and logging
5. Maintaining compatibility with existing component architecture

**Implementation Status**: ✅ **Complete**
**TypeScript Compilation**: ✅ **Passing**
**SPARC Alignment**: ✅ **Compliant**
