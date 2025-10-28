# SPARC Pseudocode: CommentThread.tsx handleReply Refactor

## Algorithm Overview
Refactor the handleReply function in CommentThread.tsx to call the correct API endpoint `POST /api/agent-posts/:postId/comments` with proper parent_id handling for threaded replies.

## Current Implementation Analysis

**File Location**: `/workspaces/agent-feed/frontend/src/components/CommentThread.tsx`

**Current Issues**:
1. Line 574: Calls wrong endpoint `/api/v1/comments/${parentId}/reply`
2. Should call: `POST /api/agent-posts/:postId/comments` with `parent_id` in body
3. Incorrect request body structure
4. Missing proper error handling for validation errors

**Correct Endpoint**: `POST /api/agent-posts/:postId/comments`

**Expected Request Body**:
```
{
  content: string,
  author: string (optional, backward compatibility),
  author_agent: string (primary field),
  parent_id: string | null,
  mentioned_users: string[] (optional),
  skipTicket: boolean (optional)
}
```

---

## Data Structure Definitions

### Input Parameters
```
STRUCTURE HandleReplyInput:
    parentId: STRING              // ID of comment being replied to
    content: STRING               // Reply text content
    postId: STRING                // ID of parent post
    currentUser: STRING           // Current user/agent identifier
```

### API Request Structure
```
STRUCTURE CommentAPIRequest:
    content: STRING               // Trimmed reply content
    author_agent: STRING          // Primary author field
    author: STRING                // Backward compatibility
    parent_id: STRING | NULL      // Parent comment ID for threading
    mentioned_users: ARRAY<STRING> // Optional @mentions
    skipTicket: BOOLEAN           // Optional, default false
```

### API Response Structure
```
STRUCTURE CommentAPIResponse:
    success: BOOLEAN
    data: Comment                 // Created comment object
    ticket: Object | NULL         // Work ticket info
    message: STRING
    source: STRING                // Database source
```

### Error Response Structure
```
STRUCTURE APIErrorResponse:
    success: BOOLEAN              // Always false
    error: STRING                 // Error message
    details: STRING (optional)    // Detailed error info
```

### State Management
```
STRUCTURE ReplyState:
    isSubmitting: BOOLEAN         // Loading state
    error: STRING                 // Error message
    optimisticComment: Comment | NULL  // Optimistic UI update
```

---

## ALGORITHM: RefactoredHandleReply

```
ALGORITHM: RefactoredHandleReply
INPUT:
    parentId (STRING) - ID of comment being replied to
    content (STRING) - Reply text content
    postId (STRING) - ID of parent post
    currentUser (STRING) - Current user identifier
    onCommentsUpdate (FUNCTION) - Callback to refresh comments

OUTPUT:
    Promise<void> - Resolves on success, throws on error

CONSTANTS:
    MAX_CONTENT_LENGTH = 2000
    MIN_CONTENT_LENGTH = 1
    REQUEST_TIMEOUT = 10000 (milliseconds)
    RETRY_ATTEMPTS = 3
    RETRY_DELAY = 1000 (milliseconds)

STATE VARIABLES:
    isLoading: BOOLEAN = false
    errorMessage: STRING = ''
    optimisticCommentId: STRING = null

TIME COMPLEXITY: O(1) - Single API request
SPACE COMPLEXITY: O(n) where n = content length

BEGIN
    // ============================================
    // PHASE 1: INPUT VALIDATION
    // Time: O(1), Space: O(1)
    // ============================================

    LOG("🔥 HandleReply called for parent:", parentId)

    // Validate content exists
    IF content IS NULL OR content IS UNDEFINED THEN
        THROW ValidationError("Reply content is required")
    END IF

    // Trim whitespace
    trimmedContent ← TRIM(content)

    // Validate content length (min)
    IF LENGTH(trimmedContent) < MIN_CONTENT_LENGTH THEN
        THROW ValidationError("Reply content cannot be empty")
    END IF

    // Validate content length (max)
    IF LENGTH(trimmedContent) > MAX_CONTENT_LENGTH THEN
        THROW ValidationError(
            "Reply content must be under " + MAX_CONTENT_LENGTH + " characters"
        )
    END IF

    // Validate postId exists
    IF postId IS NULL OR postId IS EMPTY THEN
        THROW ValidationError("Post ID is required for reply")
    END IF

    // Validate parentId exists
    IF parentId IS NULL OR parentId IS EMPTY THEN
        THROW ValidationError("Parent comment ID is required for reply")
    END IF

    // ============================================
    // PHASE 2: PREPARE REQUEST PAYLOAD
    // Time: O(n), Space: O(n) where n = content length
    // ============================================

    // Extract mentioned users from content
    mentionedUsers ← EXTRACT_MENTIONS(trimmedContent)

    // Build request payload with correct structure
    requestPayload ← {
        content: trimmedContent,
        author_agent: currentUser,           // Primary field
        author: currentUser,                 // Backward compatibility
        parent_id: parentId,                 // CRITICAL: Set parent for threading
        mentioned_users: mentionedUsers,
        skipTicket: false                    // Allow ticket creation
    }

    LOG("📤 Request payload:", requestPayload)

    // ============================================
    // PHASE 3: OPTIMISTIC UI UPDATE (Optional)
    // Time: O(1), Space: O(n)
    // ============================================

    // Generate temporary ID for optimistic update
    optimisticCommentId ← GENERATE_UUID()

    optimisticComment ← {
        id: optimisticCommentId,
        content: trimmedContent,
        author: currentUser,
        parentId: parentId,
        createdAt: CURRENT_TIMESTAMP(),
        isPending: true,                     // Mark as pending
        repliesCount: 0,
        threadDepth: CALCULATE_DEPTH(parentId)
    }

    // Add optimistic comment to UI
    ADD_OPTIMISTIC_COMMENT(optimisticComment)

    // ============================================
    // PHASE 4: SET LOADING STATE
    // Time: O(1), Space: O(1)
    // ============================================

    SET_STATE(isLoading, true)
    SET_STATE(errorMessage, '')

    // ============================================
    // PHASE 5: API REQUEST WITH RETRY LOGIC
    // Time: O(1) per attempt, Space: O(n)
    // ============================================

    remainingAttempts ← RETRY_ATTEMPTS
    lastError ← NULL

    WHILE remainingAttempts > 0 DO
        TRY
            LOG("🌐 Attempt", RETRY_ATTEMPTS - remainingAttempts + 1, "of", RETRY_ATTEMPTS)

            // Build correct endpoint URL
            endpoint ← "/api/agent-posts/" + postId + "/comments"

            // Make HTTP POST request
            response ← FETCH(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-user-id": currentUser
                },
                body: JSON_STRINGIFY(requestPayload),
                timeout: REQUEST_TIMEOUT
            })

            // ============================================
            // PHASE 6: RESPONSE VALIDATION
            // Time: O(1), Space: O(n)
            // ============================================

            // Check HTTP status
            IF response.status IS NOT IN [200, 201] THEN
                // Parse error response
                errorBody ← AWAIT response.json()

                // Handle specific error cases
                IF response.status == 400 THEN
                    // Validation error - don't retry
                    THROW ValidationError(errorBody.error)
                ELSE IF response.status == 404 THEN
                    // Post not found - don't retry
                    THROW NotFoundError("Post not found: " + postId)
                ELSE IF response.status == 500 THEN
                    // Server error - retry
                    THROW ServerError(errorBody.error)
                ELSE
                    // Unknown error
                    THROW APIError("Failed to create reply: " + errorBody.error)
                END IF
            END IF

            // Parse successful response
            responseData ← AWAIT response.json()

            // Validate response structure
            IF responseData.success IS NOT TRUE THEN
                THROW APIError("API returned success=false: " + responseData.error)
            END IF

            IF responseData.data IS NULL OR responseData.data IS UNDEFINED THEN
                THROW APIError("API response missing comment data")
            END IF

            createdComment ← responseData.data

            LOG("✅ Reply created successfully:", createdComment.id)

            // ============================================
            // PHASE 7: UPDATE UI STATE
            // Time: O(1), Space: O(1)
            // ============================================

            // Remove optimistic comment
            REMOVE_OPTIMISTIC_COMMENT(optimisticCommentId)

            // Trigger comments refresh
            IF onCommentsUpdate IS NOT NULL THEN
                AWAIT onCommentsUpdate()
            END IF

            // Clear loading state
            SET_STATE(isLoading, false)
            SET_STATE(errorMessage, '')

            // Success - exit retry loop
            RETURN

        CATCH error AS err
            LOG("❌ Request failed:", err.message)
            lastError ← err

            // Check if error is retryable
            isRetryable ← (
                err IS ServerError OR
                err IS NetworkError OR
                err IS TimeoutError
            )

            IF NOT isRetryable THEN
                // Don't retry validation/not-found errors
                LOG("⚠️  Non-retryable error, aborting")
                BREAK WHILE
            END IF

            remainingAttempts ← remainingAttempts - 1

            IF remainingAttempts > 0 THEN
                LOG("🔄 Retrying in", RETRY_DELAY, "ms...")
                AWAIT SLEEP(RETRY_DELAY)
            END IF
        END TRY
    END WHILE

    // ============================================
    // PHASE 8: ERROR HANDLING
    // Time: O(1), Space: O(1)
    // ============================================

    // Remove optimistic comment on failure
    REMOVE_OPTIMISTIC_COMMENT(optimisticCommentId)

    // Set error state
    SET_STATE(isLoading, false)

    // Build user-friendly error message
    IF lastError IS ValidationError THEN
        errorMsg ← lastError.message
    ELSE IF lastError IS NotFoundError THEN
        errorMsg ← "The post or comment no longer exists"
    ELSE IF lastError IS NetworkError THEN
        errorMsg ← "Network error. Please check your connection"
    ELSE IF lastError IS TimeoutError THEN
        errorMsg ← "Request timed out. Please try again"
    ELSE
        errorMsg ← "Failed to post reply. Please try again"
    END IF

    SET_STATE(errorMessage, errorMsg)

    LOG("❌ Final error:", errorMsg)

    // Re-throw error for component handling
    THROW lastError
END
```

---

## SUBROUTINE: ExtractMentions

```
SUBROUTINE: ExtractMentions
INPUT: content (STRING)
OUTPUT: ARRAY<STRING> - List of mentioned usernames

TIME COMPLEXITY: O(n) where n = content length
SPACE COMPLEXITY: O(m) where m = number of mentions

BEGIN
    mentions ← EMPTY_ARRAY()

    // Regex pattern to match @username mentions
    pattern ← /@(\w+)/g

    // Find all matches
    matches ← REGEX_MATCH_ALL(content, pattern)

    FOR EACH match IN matches DO
        username ← match[1]  // Capture group 1 (without @)

        // Deduplicate mentions
        IF username NOT IN mentions THEN
            mentions.APPEND(username)
        END IF
    END FOR

    RETURN mentions
END
```

---

## SUBROUTINE: CalculateDepth

```
SUBROUTINE: CalculateDepth
INPUT: parentId (STRING)
OUTPUT: INTEGER - Thread depth

TIME COMPLEXITY: O(d) where d = depth of thread
SPACE COMPLEXITY: O(1)

BEGIN
    IF parentId IS NULL THEN
        RETURN 0  // Top-level comment
    END IF

    depth ← 0
    currentId ← parentId

    WHILE currentId IS NOT NULL DO
        depth ← depth + 1

        // Find parent comment
        parentComment ← FIND_COMMENT_BY_ID(currentId)

        IF parentComment IS NULL THEN
            BREAK  // No more parents
        END IF

        currentId ← parentComment.parentId
    END WHILE

    RETURN depth
END
```

---

## Error Recovery Patterns

### Pattern 1: Network Errors
```
PATTERN: NetworkErrorRecovery

WHEN: Network request fails (timeout, connection lost)

STRATEGY:
1. Exponential backoff retry (3 attempts)
2. Keep optimistic comment visible
3. Show "Retrying..." indicator
4. Final retry shows error message
5. Option to manually retry

IMPLEMENTATION:
    retryCount ← 0
    maxRetries ← 3
    baseDelay ← 1000

    WHILE retryCount < maxRetries DO
        TRY
            RETURN AWAIT makeRequest()
        CATCH NetworkError
            retryCount ← retryCount + 1
            delay ← baseDelay * (2 ^ retryCount)
            AWAIT SLEEP(delay)
        END TRY
    END WHILE

    THROW FinalNetworkError("Network unavailable after retries")
```

### Pattern 2: Validation Errors
```
PATTERN: ValidationErrorRecovery

WHEN: API returns 400 with validation error

STRATEGY:
1. NO retry (immediate failure)
2. Remove optimistic comment
3. Show inline error near input
4. Keep user content in input
5. Focus input for correction

IMPLEMENTATION:
    CATCH ValidationError AS err
        REMOVE_OPTIMISTIC_COMMENT()
        SET_ERROR_MESSAGE(err.message)
        SET_INPUT_VALUE(content)
        FOCUS_INPUT()
        // Don't retry validation errors
        THROW err
```

### Pattern 3: Server Errors
```
PATTERN: ServerErrorRecovery

WHEN: API returns 500 (server error)

STRATEGY:
1. Retry with backoff (retryable)
2. Log error details
3. Show user-friendly message
4. Offer manual retry button

IMPLEMENTATION:
    CATCH ServerError AS err
        LOG_ERROR(err)

        IF retriesRemaining > 0 THEN
            SHOW_MESSAGE("Server error, retrying...")
            RETRY_WITH_BACKOFF()
        ELSE
            SHOW_ERROR("Server is experiencing issues")
            SHOW_RETRY_BUTTON()
        END IF
```

### Pattern 4: Optimistic Update Rollback
```
PATTERN: OptimisticRollback

WHEN: API request fails after optimistic update

STRATEGY:
1. Remove optimistic comment from UI
2. Restore original state
3. Show error message
4. Preserve user's input

IMPLEMENTATION:
    optimisticId ← ADD_OPTIMISTIC_COMMENT(data)

    TRY
        AWAIT makeRequest()
        CONFIRM_OPTIMISTIC_COMMENT(optimisticId)
    CATCH error
        REMOVE_OPTIMISTIC_COMMENT(optimisticId)
        SHOW_ERROR(error.message)
        RESTORE_INPUT(originalContent)
    END TRY
```

---

## Complexity Analysis

### Time Complexity Analysis

**Overall Function**: O(1) amortized
- Input validation: O(1)
- Content trimming: O(n) where n = content length (typically small)
- Mention extraction: O(n) where n = content length
- API request: O(1) network operation
- Response parsing: O(n) where n = response size
- State updates: O(1)
- **Dominant factor**: Network I/O (not algorithmic complexity)

**Per Phase**:
1. Validation: O(1)
2. Payload prep: O(n) where n = content length
3. Optimistic update: O(1)
4. State update: O(1)
5. API request: O(1) - async operation
6. Response validation: O(n) where n = response size
7. UI update: O(1)
8. Error handling: O(1)

**Retry Logic**: O(1) per attempt × maximum 3 attempts = O(1) constant

### Space Complexity Analysis

**Overall Function**: O(n) where n = content length
- Input string: O(n)
- Request payload: O(n)
- Response data: O(n)
- Optimistic comment: O(n)
- Error state: O(1)
- **Total**: O(n) linear in content length

**Memory Usage**:
- Request body: ~2KB max (2000 char limit)
- Response body: ~5KB typical
- State variables: ~1KB
- **Total Peak**: ~8KB per request

### Network Performance

**Expected Latency**:
- Local dev: 10-50ms
- Production: 100-500ms
- Timeout threshold: 10000ms (10 seconds)

**Retry Overhead**:
- Attempt 1: 0ms delay
- Attempt 2: +1000ms delay
- Attempt 3: +2000ms delay
- **Max total**: 13000ms (with retries)

---

## Integration Points

### Component Props Interface
```
INTERFACE: OnReplyCallback
    SIGNATURE: (parentId: STRING, content: STRING) => Promise<void>
    THROWS: ValidationError | NetworkError | APIError
```

### State Management
```
STATE UPDATES REQUIRED:
1. setIsLoading(boolean) - Loading indicator
2. setReplyContent(string) - Clear input on success
3. setReplyError(string) - Show error messages
4. setIsReplying(boolean) - Close reply form on success
```

### External Dependencies
```
DEPENDENCIES:
1. fetch() - HTTP client (native)
2. JSON.stringify() - Request serialization
3. response.json() - Response parsing
4. onCommentsUpdate() - Parent callback
5. UUID generation - Optimistic IDs
```

---

## Testing Considerations

### Unit Tests Required
```
TEST CASES:
1. ✅ Valid reply creates comment
2. ✅ Empty content throws validation error
3. ✅ Content over 2000 chars throws error
4. ✅ Missing postId throws error
5. ✅ Missing parentId throws error
6. ✅ Network error triggers retry
7. ✅ Server error triggers retry
8. ✅ Validation error doesn't retry
9. ✅ Successful retry after failure
10. ✅ Max retries exhausted shows error
11. ✅ Optimistic update added/removed
12. ✅ Mentions extracted correctly
13. ✅ Callback invoked on success
```

### Integration Tests Required
```
TEST SCENARIOS:
1. ✅ Create top-level reply
2. ✅ Create nested reply (depth > 1)
3. ✅ Reply with mentions
4. ✅ Reply to deleted comment fails
5. ✅ Reply to non-existent post fails
6. ✅ Concurrent replies handled correctly
7. ✅ Real-time updates reflected
```

---

## Migration Guide

### Changes Required in CommentThread.tsx

**Line 571-594 (current handleReply)**:
```
// BEFORE (INCORRECT):
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
      // ... rest of implementation
    }
  }, [postId, currentUser, onCommentsUpdate]);

// AFTER (CORRECT):
const handleReply = useCallback(async (parentId: string, content: string) => {
    setIsLoading(true);
    try {
      // CRITICAL FIX: Use correct endpoint
      const endpoint = `/api/agent-posts/${postId}/comments`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser
        },
        body: JSON.stringify({
          content: content.trim(),
          author_agent: currentUser,      // Primary field
          author: currentUser,             // Backward compatibility
          parent_id: parentId,             // CRITICAL: Set parent for threading
          mentioned_users: extractMentions(content),
          skipTicket: false
        })
      });
      // ... rest of implementation with improved error handling
    }
  }, [postId, currentUser, onCommentsUpdate]);
```

### Backward Compatibility Checklist
```
COMPATIBILITY REQUIREMENTS:
✅ Component props interface unchanged
✅ Callback signature unchanged
✅ State management unchanged
✅ Error handling improved (more robust)
✅ UI behavior unchanged (better UX)
✅ Optimistic updates optional (can disable)
```

---

## Performance Optimizations

### Optimization 1: Request Deduplication
```
PATTERN: Prevent duplicate requests

IMPLEMENTATION:
    requestInFlightMap ← NEW Map()

    IF requestInFlightMap.has(parentId) THEN
        RETURN requestInFlightMap.get(parentId)
    END IF

    promise ← makeRequest(parentId, content)
    requestInFlightMap.set(parentId, promise)

    promise.finally(() => {
        requestInFlightMap.delete(parentId)
    })

    RETURN promise
```

### Optimization 2: Content Caching
```
PATTERN: Cache trimmed content and mentions

IMPLEMENTATION:
    contentCache ← NEW Map()

    cacheKey ← HASH(content)

    IF contentCache.has(cacheKey) THEN
        cached ← contentCache.get(cacheKey)
        RETURN {
            trimmed: cached.trimmed,
            mentions: cached.mentions
        }
    END IF

    trimmed ← TRIM(content)
    mentions ← EXTRACT_MENTIONS(trimmed)

    contentCache.set(cacheKey, { trimmed, mentions })

    RETURN { trimmed, mentions }
```

### Optimization 3: Batch UI Updates
```
PATTERN: Batch state updates to reduce re-renders

IMPLEMENTATION:
    // Instead of multiple setState calls
    SET_STATE(isLoading, true)
    SET_STATE(error, '')
    SET_STATE(optimistic, comment)

    // Use single batched update
    UPDATE_STATE({
        isLoading: true,
        error: '',
        optimisticComment: comment
    })
```

---

## Security Considerations

### Input Sanitization
```
SECURITY PATTERN: Sanitize content before sending

IMPLEMENTATION:
    // Prevent XSS attacks
    sanitizedContent ← SANITIZE_HTML(content)

    // Prevent SQL injection (handled by parameterized queries on server)
    // No client-side action needed

    // Prevent mention spam
    IF COUNT(mentions) > MAX_MENTIONS THEN
        THROW ValidationError("Too many mentions (max " + MAX_MENTIONS + ")")
    END IF
```

### Request Authentication
```
SECURITY PATTERN: Include user authentication

IMPLEMENTATION:
    headers ← {
        'Content-Type': 'application/json',
        'x-user-id': currentUser,
        'Authorization': 'Bearer ' + authToken  // If using JWT
    }
```

---

## Summary

**Algorithm**: RefactoredHandleReply
**Purpose**: Fix CommentThread.tsx to call correct API endpoint for threaded replies
**Complexity**: O(1) time (network), O(n) space (content length)
**Key Fix**: Change endpoint from `/api/v1/comments/:id/reply` to `/api/agent-posts/:postId/comments` with `parent_id` in body
**Error Handling**: Retry logic for network/server errors, immediate fail for validation errors
**Backward Compatibility**: Maintained component interface, improved robustness

**Critical Changes**:
1. ✅ Endpoint: `/api/agent-posts/${postId}/comments`
2. ✅ Request body: Include `parent_id` field
3. ✅ Headers: Add `x-user-id` header
4. ✅ Error handling: Retry logic with exponential backoff
5. ✅ Optimistic updates: Add/remove UI updates
6. ✅ Validation: Enhanced input validation

**Files to Modify**:
- `/workspaces/agent-feed/frontend/src/components/CommentThread.tsx` (lines 571-594)

**Testing Required**:
- Unit tests for validation, retry logic, error handling
- Integration tests for API endpoint, threading, real-time updates
