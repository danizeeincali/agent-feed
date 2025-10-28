# SPARC Pseudocode: Comment Reply Issues Fix

## Overview
This document contains algorithm designs for fixing two critical issues:
1. Date field mapping inconsistency (`created_at` vs `createdAt`)
2. Incorrect comment endpoint in PostCard component

## Problem Statement
- **Issue 1**: Frontend expects `createdAt` but API returns `created_at`
- **Issue 2**: PostCard fetches from `/api/v1/posts/:id/comments` instead of `/api/agent-posts/:id/comments`

---

## Algorithm 1: Date Field Transform

### Purpose
Normalize date field names from API response format to frontend expected format.

```
ALGORITHM: TransformCommentDateFields
INPUT: rawComment (object from API)
OUTPUT: transformedComment (object with normalized fields)

TIME COMPLEXITY: O(n) where n = number of comments
SPACE COMPLEXITY: O(n) for transformed data structure

BEGIN
    // Validate input
    IF rawComment is null OR rawComment is undefined THEN
        RETURN null
    END IF

    // Create transformed object
    transformedComment ← EMPTY_OBJECT()

    // Map all fields from raw to transformed
    FOR EACH (key, value) IN rawComment DO
        transformedComment[key] ← value
    END FOR

    // Transform snake_case date fields to camelCase
    IF rawComment.created_at EXISTS THEN
        transformedComment.createdAt ← rawComment.created_at
        DELETE transformedComment.created_at
    END IF

    IF rawComment.updated_at EXISTS THEN
        transformedComment.updatedAt ← rawComment.updated_at
        DELETE transformedComment.updated_at
    END IF

    IF rawComment.deleted_at EXISTS THEN
        transformedComment.deletedAt ← rawComment.deleted_at
        DELETE transformedComment.deleted_at
    END IF

    // Transform nested author fields if present
    IF rawComment.author EXISTS THEN
        IF rawComment.author.created_at EXISTS THEN
            transformedComment.author.createdAt ← rawComment.author.created_at
            DELETE transformedComment.author.created_at
        END IF
    END IF

    // Recursively transform children
    IF rawComment.children EXISTS AND rawComment.children.length > 0 THEN
        transformedComment.children ← EMPTY_ARRAY()
        FOR EACH child IN rawComment.children DO
            transformedChild ← TransformCommentDateFields(child)
            transformedComment.children.APPEND(transformedChild)
        END FOR
    END IF

    RETURN transformedComment
END

ERROR HANDLING:
    - Null/undefined input → return null
    - Missing date fields → skip transformation
    - Invalid date format → preserve original value
    - Circular references → detect and break recursion
```

---

## Algorithm 2: Bulk Comment Transform

### Purpose
Transform entire comment arrays from API responses.

```
ALGORITHM: TransformCommentArray
INPUT: rawComments (array of comment objects)
OUTPUT: transformedComments (array with normalized fields)

TIME COMPLEXITY: O(n * m) where n = comments, m = avg depth
SPACE COMPLEXITY: O(n * m) for transformed tree structure

BEGIN
    // Validate input
    IF rawComments is null OR NOT IS_ARRAY(rawComments) THEN
        RETURN EMPTY_ARRAY()
    END IF

    transformedComments ← EMPTY_ARRAY()

    // Transform each comment
    FOR EACH rawComment IN rawComments DO
        transformedComment ← TransformCommentDateFields(rawComment)

        IF transformedComment is not null THEN
            transformedComments.APPEND(transformedComment)
        END IF
    END FOR

    RETURN transformedComments
END

COMPLEXITY ANALYSIS:
    Best Case: O(n) - flat comment list, no nesting
    Average Case: O(n * log m) - balanced tree structure
    Worst Case: O(n * m) - deeply nested linear thread
```

---

## Algorithm 3: API Response Interceptor

### Purpose
Automatically transform all API responses before reaching components.

```
ALGORITHM: ApiResponseInterceptor
INPUT: response (HTTP response object), endpoint (string)
OUTPUT: transformedResponse (normalized response)

TIME COMPLEXITY: O(1) for setup, O(n) for transformation
SPACE COMPLEXITY: O(n) for response data

BEGIN
    // Parse response body
    responseData ← PARSE_JSON(response.body)

    // Check if response contains comments
    IF endpoint.CONTAINS('/comments') THEN

        // Handle different response structures
        CASE responseData.structure OF

            // Array response: [ {...}, {...} ]
            WHEN IS_ARRAY(responseData) THEN
                transformedData ← TransformCommentArray(responseData)
                RETURN CREATE_RESPONSE(transformedData, response.status)

            // Object with data array: { data: [...] }
            WHEN responseData.data EXISTS AND IS_ARRAY(responseData.data) THEN
                responseData.data ← TransformCommentArray(responseData.data)
                RETURN CREATE_RESPONSE(responseData, response.status)

            // Object with comment: { comment: {...} }
            WHEN responseData.comment EXISTS THEN
                responseData.comment ← TransformCommentDateFields(responseData.comment)
                RETURN CREATE_RESPONSE(responseData, response.status)

            // Object with comments array: { comments: [...] }
            WHEN responseData.comments EXISTS THEN
                responseData.comments ← TransformCommentArray(responseData.comments)
                RETURN CREATE_RESPONSE(responseData, response.status)

            DEFAULT:
                RETURN response
        END CASE
    END IF

    RETURN response
END
```

---

## Algorithm 4: Endpoint Path Resolution

### Purpose
Determine correct API endpoint based on post type (agent post vs regular post).

```
ALGORITHM: ResolveCommentEndpoint
INPUT: postId (string), postType (string or null)
OUTPUT: endpointUrl (string)

TIME COMPLEXITY: O(1)
SPACE COMPLEXITY: O(1)

CONSTANTS:
    AGENT_POST_PREFIX = "/api/agent-posts"
    REGULAR_POST_PREFIX = "/api/v1/posts"
    COMMENT_SUFFIX = "/comments"

BEGIN
    // Validate input
    IF postId is null OR postId is empty THEN
        THROW ERROR("Invalid post ID")
    END IF

    // Determine endpoint prefix
    endpointPrefix ← ""

    // Strategy 1: Explicit post type
    IF postType is not null THEN
        IF postType = "agent" OR postType = "agent_post" THEN
            endpointPrefix ← AGENT_POST_PREFIX
        ELSE
            endpointPrefix ← REGULAR_POST_PREFIX
        END IF

    // Strategy 2: Infer from post ID format
    ELSE IF postId.STARTS_WITH("agent_") THEN
        endpointPrefix ← AGENT_POST_PREFIX

    // Strategy 3: Check post metadata cache
    ELSE
        cachedPostType ← GET_FROM_CACHE("post_type_" + postId)

        IF cachedPostType = "agent" THEN
            endpointPrefix ← AGENT_POST_PREFIX
        ELSE
            // Default to agent posts (current system default)
            endpointPrefix ← AGENT_POST_PREFIX
        END IF
    END IF

    // Construct full endpoint
    endpointUrl ← endpointPrefix + "/" + postId + COMMENT_SUFFIX

    RETURN endpointUrl
END

OPTIMIZATION NOTES:
    - Cache post type after first fetch to avoid repeated inference
    - Use explicit post type when available
    - Default to agent posts for current system architecture
```

---

## Algorithm 5: Updated loadComments Implementation

### Purpose
Load comments with correct endpoint and date field handling.

```
ALGORITHM: LoadComments
INPUT: postId (string), forceRefresh (boolean)
OUTPUT: comments (array), success (boolean)

TIME COMPLEXITY: O(n * m) where n = comments, m = avg depth
SPACE COMPLEXITY: O(n * m) for comment tree

STATE VARIABLES:
    comments: Array<Comment>
    commentsLoaded: Boolean
    isLoading: Boolean
    error: Error or null

BEGIN
    // Skip if already loaded and not forcing refresh
    IF commentsLoaded = true AND forceRefresh = false THEN
        RETURN { comments, success: true }
    END IF

    // Prevent concurrent loads
    IF isLoading = true THEN
        RETURN { comments, success: false }
    END IF

    // Set loading state
    SET_STATE(isLoading, true)
    SET_STATE(error, null)

    TRY
        // Resolve correct endpoint
        endpoint ← ResolveCommentEndpoint(postId, "agent")

        // Fetch comments from API
        response ← AWAIT FETCH(endpoint, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
        })

        // Check response status
        IF response.status >= 200 AND response.status < 300 THEN

            // Parse response
            responseData ← AWAIT response.JSON()

            // Extract comments from response structure
            rawComments ← EXTRACT_COMMENTS(responseData)

            // Transform date fields
            transformedComments ← TransformCommentArray(rawComments)

            // Update state
            SET_STATE(comments, transformedComments)
            SET_STATE(commentsLoaded, true)

            // Update engagement count if provided
            IF responseData.totalComments EXISTS THEN
                UPDATE_ENGAGEMENT_STATE({
                    comments: responseData.totalComments
                })
            ELSE
                UPDATE_ENGAGEMENT_STATE({
                    comments: transformedComments.length
                })
            END IF

            RETURN { comments: transformedComments, success: true }

        ELSE IF response.status = 404 THEN
            // Post not found - set empty comments
            SET_STATE(comments, EMPTY_ARRAY())
            SET_STATE(commentsLoaded, true)
            RETURN { comments: EMPTY_ARRAY(), success: true }

        ELSE
            // Server error
            errorMessage ← "Failed to load comments: " + response.statusText
            SET_STATE(error, NEW_ERROR(errorMessage))
            LOG_ERROR(errorMessage, { postId, status: response.status })
            RETURN { comments, success: false }
        END IF

    CATCH (networkError)
        // Network or parsing error
        errorMessage ← "Network error loading comments: " + networkError.message
        SET_STATE(error, NEW_ERROR(errorMessage))
        LOG_ERROR(errorMessage, { postId, error: networkError })
        RETURN { comments, success: false }

    FINALLY
        // Always clear loading state
        SET_STATE(isLoading, false)
    END TRY
END

SUBROUTINE: EXTRACT_COMMENTS
INPUT: responseData (object)
OUTPUT: comments (array)

BEGIN
    // Handle various response structures
    IF IS_ARRAY(responseData) THEN
        RETURN responseData
    ELSE IF responseData.data EXISTS AND IS_ARRAY(responseData.data) THEN
        RETURN responseData.data
    ELSE IF responseData.comments EXISTS AND IS_ARRAY(responseData.comments) THEN
        RETURN responseData.comments
    ELSE
        RETURN EMPTY_ARRAY()
    END IF
END
```

---

## Algorithm 6: Date Formatting for Display

### Purpose
Parse and format comment dates for human-readable display.

```
ALGORITHM: FormatCommentDate
INPUT: dateValue (string or Date object), displayMode (string)
OUTPUT: formattedDate (string)

TIME COMPLEXITY: O(1)
SPACE COMPLEXITY: O(1)

BEGIN
    // Validate and parse date
    IF dateValue is null OR dateValue is undefined THEN
        RETURN "Unknown date"
    END IF

    // Convert to Date object if string
    IF IS_STRING(dateValue) THEN
        parsedDate ← NEW_DATE(dateValue)

        // Validate parsed date
        IF NOT IS_VALID_DATE(parsedDate) THEN
            LOG_WARNING("Invalid date format", { dateValue })
            RETURN "Invalid date"
        END IF
    ELSE IF IS_DATE(dateValue) THEN
        parsedDate ← dateValue
    ELSE
        RETURN "Invalid date type"
    END IF

    // Get current time
    currentTime ← NEW_DATE()

    // Calculate time difference
    timeDiffMs ← currentTime.getTime() - parsedDate.getTime()

    // Handle future dates (clock skew)
    IF timeDiffMs < 0 THEN
        RETURN "Just now"
    END IF

    // Convert to appropriate units
    timeDiffMinutes ← FLOOR(timeDiffMs / 60000)
    timeDiffHours ← FLOOR(timeDiffMs / 3600000)
    timeDiffDays ← FLOOR(timeDiffMs / 86400000)

    // Format based on display mode and time difference
    CASE displayMode OF

        WHEN "relative" THEN
            IF timeDiffMinutes < 1 THEN
                RETURN "Just now"
            ELSE IF timeDiffMinutes < 60 THEN
                RETURN timeDiffMinutes + "m ago"
            ELSE IF timeDiffHours < 24 THEN
                RETURN timeDiffHours + "h ago"
            ELSE IF timeDiffDays < 7 THEN
                RETURN timeDiffDays + "d ago"
            ELSE IF timeDiffDays < 30 THEN
                weeks ← FLOOR(timeDiffDays / 7)
                RETURN weeks + "w ago"
            ELSE
                months ← FLOOR(timeDiffDays / 30)
                RETURN months + "mo ago"
            END IF

        WHEN "absolute" THEN
            // Format: "Jan 15, 2025 at 3:45 PM"
            RETURN FORMAT_DATE(parsedDate, "MMM DD, YYYY at h:mm A")

        WHEN "iso" THEN
            RETURN parsedDate.toISOString()

        WHEN "smart" THEN
            // Use relative for recent, absolute for old
            IF timeDiffDays < 7 THEN
                RETURN FormatCommentDate(dateValue, "relative")
            ELSE
                RETURN FORMAT_DATE(parsedDate, "MMM DD, YYYY")
            END IF

        DEFAULT:
            RETURN FormatCommentDate(dateValue, "relative")
    END CASE
END

HELPER: IS_VALID_DATE
INPUT: dateObject (Date)
OUTPUT: isValid (boolean)

BEGIN
    RETURN NOT IS_NAN(dateObject.getTime())
END
```

---

## Algorithm 7: Comment Refresh After Reply

### Purpose
Ensure comment list refreshes after a reply is submitted.

```
ALGORITHM: HandleCommentReplySubmitted
INPUT: newComment (Comment object), parentId (string or null)
OUTPUT: success (boolean)

TIME COMPLEXITY: O(n * m) for full reload, O(log n) for incremental
SPACE COMPLEXITY: O(1) for incremental update

STATE VARIABLES:
    comments: Array<Comment>
    commentsLoaded: Boolean

BEGIN
    // Transform new comment date fields
    transformedComment ← TransformCommentDateFields(newComment)

    // Decide update strategy
    IF FEATURE_FLAG("incremental_comment_updates") = true THEN
        // Strategy A: Incremental update (faster, more complex)
        success ← IncrementalCommentUpdate(transformedComment, parentId)
    ELSE
        // Strategy B: Full reload (simpler, reliable)
        success ← FullCommentReload()
    END IF

    // Emit success event if real-time updates enabled
    IF success = true AND WEBSOCKET_CONNECTED() THEN
        EMIT_EVENT("comment:created", {
            postId: transformedComment.postId,
            commentId: transformedComment.id,
            parentId: parentId
        })
    END IF

    RETURN success
END

SUBROUTINE: IncrementalCommentUpdate
INPUT: newComment (Comment), parentId (string or null)
OUTPUT: success (boolean)

BEGIN
    IF parentId is null THEN
        // Add as root comment
        updatedComments ← CLONE(comments)
        updatedComments.APPEND(newComment)

        // Sort by date
        SORT(updatedComments, BY createdAt ASCENDING)

        SET_STATE(comments, updatedComments)

    ELSE
        // Find parent and add as child
        updatedComments ← DEEP_CLONE(comments)
        parentComment ← FIND_COMMENT_BY_ID(updatedComments, parentId)

        IF parentComment is null THEN
            // Parent not found - trigger full reload
            RETURN FullCommentReload()
        END IF

        // Ensure children array exists
        IF parentComment.children is null THEN
            parentComment.children ← EMPTY_ARRAY()
        END IF

        // Add new comment to children
        parentComment.children.APPEND(newComment)

        // Sort children by date
        SORT(parentComment.children, BY createdAt ASCENDING)

        SET_STATE(comments, updatedComments)
    END IF

    // Update engagement count
    INCREMENT_ENGAGEMENT_COUNT("comments", 1)

    RETURN true
END

SUBROUTINE: FullCommentReload
OUTPUT: success (boolean)

BEGIN
    // Reset loaded state to force reload
    SET_STATE(commentsLoaded, false)

    // Trigger load
    result ← LoadComments(currentPostId, forceRefresh: true)

    RETURN result.success
END

HELPER: FIND_COMMENT_BY_ID
INPUT: commentTree (Array<Comment>), targetId (string)
OUTPUT: comment (Comment or null)

BEGIN
    FOR EACH comment IN commentTree DO
        IF comment.id = targetId THEN
            RETURN comment
        END IF

        // Search in children recursively
        IF comment.children EXISTS AND comment.children.length > 0 THEN
            childResult ← FIND_COMMENT_BY_ID(comment.children, targetId)
            IF childResult is not null THEN
                RETURN childResult
            END IF
        END IF
    END FOR

    RETURN null
END
```

---

## Algorithm 8: Error Recovery Strategy

### Purpose
Handle API errors gracefully with retry logic.

```
ALGORITHM: LoadCommentsWithRetry
INPUT: postId (string), maxRetries (integer)
OUTPUT: comments (array), success (boolean)

TIME COMPLEXITY: O(n * r) where r = retry attempts
SPACE COMPLEXITY: O(n)

CONSTANTS:
    INITIAL_RETRY_DELAY = 1000  // 1 second
    MAX_RETRY_DELAY = 10000     // 10 seconds
    BACKOFF_MULTIPLIER = 2

BEGIN
    retryCount ← 0
    retryDelay ← INITIAL_RETRY_DELAY
    lastError ← null

    WHILE retryCount <= maxRetries DO
        result ← LoadComments(postId, forceRefresh: true)

        IF result.success = true THEN
            RETURN result
        END IF

        // Store error for final return
        lastError ← result.error

        // Don't retry on client errors (4xx)
        IF result.statusCode >= 400 AND result.statusCode < 500 THEN
            BREAK
        END IF

        // Increment retry count
        retryCount ← retryCount + 1

        // Check if should retry
        IF retryCount > maxRetries THEN
            BREAK
        END IF

        // Log retry attempt
        LOG_INFO("Retrying comment load", {
            postId: postId,
            attempt: retryCount,
            delay: retryDelay
        })

        // Wait before retry with exponential backoff
        AWAIT SLEEP(retryDelay)

        // Increase delay for next retry
        retryDelay ← MIN(retryDelay * BACKOFF_MULTIPLIER, MAX_RETRY_DELAY)
    END WHILE

    // All retries failed
    LOG_ERROR("Failed to load comments after retries", {
        postId: postId,
        attempts: retryCount,
        lastError: lastError
    })

    RETURN {
        comments: EMPTY_ARRAY(),
        success: false,
        error: lastError
    }
END
```

---

## Implementation Priority

### Phase 1: Critical Fixes (Immediate)
1. **Algorithm 4**: Update endpoint path resolution
2. **Algorithm 1**: Date field transformation
3. **Algorithm 5**: Updated loadComments with correct endpoint

### Phase 2: Reliability (Next)
4. **Algorithm 7**: Comment refresh after reply
5. **Algorithm 8**: Error recovery with retry logic

### Phase 3: Enhancement (Optional)
6. **Algorithm 3**: API response interceptor
7. **Algorithm 6**: Enhanced date formatting

---

## Integration Points

### PostCard Component
```
INTEGRATION: PostCard.tsx

1. Replace loadComments function:
   - Use Algorithm 5 (LoadComments)
   - Apply Algorithm 4 (ResolveCommentEndpoint)

2. Update handleCommentsUpdate:
   - Use Algorithm 7 (HandleCommentReplySubmitted)

3. Add date formatting:
   - Use Algorithm 6 (FormatCommentDate)

CHANGES REQUIRED:
   Line 101: Update endpoint from '/api/v1/posts' to '/api/agent-posts'
   Line 103-105: Add date field transformation
   Line 126-129: Implement intelligent refresh strategy
```

### Comment Service
```
INTEGRATION: commentService.ts

1. Add response transformation:
   - Apply Algorithm 3 (ApiResponseInterceptor)
   - Add to all comment fetch operations

2. Update endpoint construction:
   - Use Algorithm 4 for all comment endpoints
   - Support both agent-posts and regular posts

3. Add error handling:
   - Implement Algorithm 8 for retry logic
   - Add to getPostComments, createComment, replyToComment

CHANGES REQUIRED:
   Line 50: Update baseUrl to support dynamic prefixes
   Line 83-87: Add transformation pipeline
   Line 514: Use transformed createdAt field
```

---

## Performance Considerations

### Time Complexity Summary
- **Date transformation**: O(n * m) where n = comments, m = depth
- **Endpoint resolution**: O(1) constant time
- **Comment loading**: O(n * m) with network latency
- **Incremental update**: O(log n) for tree traversal
- **Full reload**: O(n * m) for complete refresh

### Space Complexity Summary
- **Transformed comments**: O(n * m) for tree structure
- **Cache storage**: O(n) for comment metadata
- **Retry state**: O(1) constant space

### Optimization Strategies
1. **Memoization**: Cache transformed comments by ID
2. **Lazy loading**: Load comments on-demand
3. **Pagination**: Limit initial comment fetch
4. **Debouncing**: Prevent multiple simultaneous refreshes
5. **Incremental updates**: Prefer targeted updates over full reloads

---

## Testing Checklist

### Unit Tests
- [ ] Date field transformation (null, valid, invalid dates)
- [ ] Endpoint resolution (agent posts, regular posts, edge cases)
- [ ] Comment tree building with transformed dates
- [ ] Error handling for malformed responses

### Integration Tests
- [ ] Load comments from correct endpoint
- [ ] Comments refresh after reply submission
- [ ] Date fields display correctly in UI
- [ ] Error recovery with retry logic

### E2E Tests
- [ ] User submits reply → comments refresh automatically
- [ ] Dates display in relative format ("5m ago")
- [ ] Comments load from /api/agent-posts endpoint
- [ ] Network failures handled gracefully

---

## Rollback Plan

### If Issues Arise
1. **Revert endpoint change**: Use feature flag to toggle endpoint
2. **Disable transformation**: Add bypass flag for date transformation
3. **Fallback to full reload**: Disable incremental updates
4. **Add monitoring**: Track transformation errors and endpoint failures

### Feature Flags
```
FEATURE_FLAGS:
    - use_agent_posts_endpoint: true/false
    - transform_date_fields: true/false
    - incremental_comment_updates: true/false
    - retry_on_failure: true/false
```

---

## Success Metrics

### Correctness
- 0 date parsing errors in production
- 100% correct endpoint usage
- 0 comment loading failures (non-network)

### Performance
- Comment load time < 500ms (p95)
- Date transformation overhead < 10ms
- Incremental update latency < 100ms

### User Experience
- Comments visible immediately after posting
- Dates always display correctly
- No visible loading delays on refresh

---

**Document Version**: 1.0
**Author**: SPARC Pseudocode Agent
**Date**: 2025-10-27
**Status**: Ready for Architecture Phase
