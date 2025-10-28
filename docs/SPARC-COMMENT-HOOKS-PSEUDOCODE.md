# SPARC Pseudocode: Comment Threading Hooks

## Document Status
- **Phase**: Pseudocode (SPARC Phase 2)
- **Created**: 2025-10-26
- **Dependencies**: SPARC-COMMENT-HOOKS-SPEC.md (pending)
- **Next Phase**: Architecture Design

---

## Overview

This document provides detailed algorithmic pseudocode for comment threading React hooks, including state management, API interactions, real-time synchronization, and optimistic UI updates.

## Core Data Structures

```
STRUCTURE: Comment
    id: string (UUID)
    content: string
    author_id: string
    parent_id: string or null
    post_id: string
    created_at: timestamp
    updated_at: timestamp
    deleted_at: timestamp or null
    reaction_counts: Map<reaction_type, count>
    user_reaction: string or null
    replies: Array<Comment>
    depth: integer
    is_optimistic: boolean (client-only)
    optimistic_id: string or null (client-only)

STRUCTURE: CommentState
    comments: Array<Comment>
    commentMap: Map<comment_id, Comment>
    threadTree: Map<parent_id, Array<Comment>>
    loading: boolean
    error: Error or null
    optimisticOperations: Set<operation_id>

STRUCTURE: WebSocketEvent
    type: enum (COMMENT_ADDED, COMMENT_UPDATED, COMMENT_DELETED, COMMENT_REACTED)
    payload: object
    timestamp: timestamp
```

---

## Algorithm 1: useCommentThreading Hook

### 1.1 Hook Initialization

```
ALGORITHM: InitializeCommentThreading
INPUT: postId (string), options (object)
OUTPUT: CommentState and handler functions

BEGIN
    // Initialize state
    state ← {
        comments: [],
        commentMap: new Map(),
        threadTree: new Map(),
        loading: true,
        error: null,
        optimisticOperations: new Set()
    }

    // Configuration
    config ← {
        maxDepth: options.maxDepth OR 5,
        pageSize: options.pageSize OR 50,
        enableOptimistic: options.enableOptimistic OR true,
        retryAttempts: options.retryAttempts OR 3,
        retryDelay: options.retryDelay OR 1000
    }

    // Initialize on mount
    CALL FetchComments(postId)

    RETURN {
        state: state,
        handlers: {
            addComment: AddCommentHandler,
            updateComment: UpdateCommentHandler,
            deleteComment: DeleteCommentHandler,
            reactToComment: ReactToCommentHandler,
            refreshComments: RefreshCommentsHandler
        }
    }
END
```

### 1.2 Fetch Comments Algorithm

```
ALGORITHM: FetchComments
INPUT: postId (string), options (object)
OUTPUT: void (updates state)

BEGIN
    SET state.loading ← true
    SET state.error ← null

    TRY
        // API call with error handling
        response ← AWAIT API.GET("/api/posts/" + postId + "/comments", {
            params: {
                include_deleted: false,
                order_by: "created_at",
                order_direction: "asc"
            }
        })

        IF response.status ≠ 200 THEN
            THROW Error("Failed to fetch comments: " + response.statusText)
        END IF

        comments ← response.data.comments

        // Build data structures
        commentMap ← new Map()
        threadTree ← new Map()

        // First pass: Create map and initialize tree
        FOR EACH comment IN comments DO
            commentMap.set(comment.id, {
                ...comment,
                replies: [],
                depth: 0
            })

            parent_id ← comment.parent_id OR "root"
            IF NOT threadTree.has(parent_id) THEN
                threadTree.set(parent_id, [])
            END IF
        END FOR

        // Second pass: Build tree structure
        FOR EACH comment IN comments DO
            parent_id ← comment.parent_id OR "root"
            threadTree.get(parent_id).push(commentMap.get(comment.id))
        END FOR

        // Third pass: Calculate depths and build reply arrays
        CALL CalculateCommentDepths(threadTree, commentMap, "root", 0)

        // Update state
        SET state.comments ← comments
        SET state.commentMap ← commentMap
        SET state.threadTree ← threadTree
        SET state.loading ← false

    CATCH error
        SET state.error ← error
        SET state.loading ← false
        CALL LogError("FetchComments", error, { postId: postId })

        // Retry logic
        IF error.isNetworkError AND retryCount < config.retryAttempts THEN
            AWAIT Sleep(config.retryDelay * (retryCount + 1))
            CALL FetchComments(postId, { ...options, retryCount: retryCount + 1 })
        END IF
    END TRY
END
```

### 1.3 Calculate Comment Depths

```
ALGORITHM: CalculateCommentDepths
INPUT: threadTree (Map), commentMap (Map), parentId (string), depth (integer)
OUTPUT: void (modifies commentMap in place)

BEGIN
    IF NOT threadTree.has(parentId) THEN
        RETURN
    END IF

    children ← threadTree.get(parentId)

    FOR EACH comment IN children DO
        // Set depth
        comment.depth ← depth

        // Add to parent's replies if not root
        IF parentId ≠ "root" AND commentMap.has(parentId) THEN
            parent ← commentMap.get(parentId)
            parent.replies.push(comment)
        END IF

        // Recursively process children
        IF depth < config.maxDepth THEN
            CALL CalculateCommentDepths(threadTree, commentMap, comment.id, depth + 1)
        END IF
    END FOR
END
```

### 1.4 Add Comment Algorithm

```
ALGORITHM: AddComment
INPUT: content (string), parentId (string or null)
OUTPUT: Promise<Comment>

BEGIN
    // Validation
    IF content.trim().length = 0 THEN
        THROW ValidationError("Comment content cannot be empty")
    END IF

    IF content.length > 10000 THEN
        THROW ValidationError("Comment content exceeds maximum length")
    END IF

    // Generate optimistic ID
    optimisticId ← GenerateUUID()
    operationId ← GenerateUUID()

    // Create optimistic comment
    IF config.enableOptimistic THEN
        optimisticComment ← {
            id: optimisticId,
            content: content,
            parent_id: parentId,
            post_id: postId,
            author_id: currentUser.id,
            created_at: NOW(),
            updated_at: NOW(),
            deleted_at: null,
            reaction_counts: {},
            user_reaction: null,
            replies: [],
            depth: parentId ? (commentMap.get(parentId).depth + 1) : 0,
            is_optimistic: true,
            optimistic_id: optimisticId
        }

        // Add optimistic comment to state
        CALL AddOptimisticComment(optimisticComment)
        state.optimisticOperations.add(operationId)
    END IF

    TRY
        // API call
        response ← AWAIT API.POST("/api/comments", {
            body: {
                content: content,
                parent_id: parentId,
                post_id: postId
            },
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + authToken
            }
        })

        IF response.status ≠ 201 THEN
            THROW Error("Failed to create comment: " + response.statusText)
        END IF

        newComment ← response.data.comment

        // Replace optimistic comment with real comment
        IF config.enableOptimistic THEN
            CALL ReplaceOptimisticComment(optimisticId, newComment)
            state.optimisticOperations.delete(operationId)
        ELSE
            CALL AddCommentToState(newComment)
        END IF

        RETURN newComment

    CATCH error
        // Remove optimistic comment on error
        IF config.enableOptimistic THEN
            CALL RemoveOptimisticComment(optimisticId)
            state.optimisticOperations.delete(operationId)
        END IF

        // Error handling
        IF error.status = 401 THEN
            CALL HandleAuthError()
        ELSE IF error.status = 429 THEN
            THROW RateLimitError("Too many comments. Please wait before posting again.")
        ELSE IF error.status = 400 THEN
            THROW ValidationError(error.data.message OR "Invalid comment data")
        ELSE
            THROW Error("Failed to add comment: " + error.message)
        END IF

        // Retry logic for network errors
        IF error.isNetworkError AND retryCount < config.retryAttempts THEN
            AWAIT Sleep(config.retryDelay * Math.pow(2, retryCount))
            RETURN CALL AddComment(content, parentId, retryCount + 1)
        END IF

        THROW error
    END TRY
END
```

### 1.5 Optimistic Comment Operations

```
ALGORITHM: AddOptimisticComment
INPUT: comment (Comment)
OUTPUT: void

BEGIN
    // Add to comments array
    state.comments.push(comment)

    // Add to comment map
    state.commentMap.set(comment.id, comment)

    // Add to thread tree
    parent_id ← comment.parent_id OR "root"
    IF NOT state.threadTree.has(parent_id) THEN
        state.threadTree.set(parent_id, [])
    END IF
    state.threadTree.get(parent_id).push(comment)

    // Add to parent's replies
    IF comment.parent_id AND state.commentMap.has(comment.parent_id) THEN
        parent ← state.commentMap.get(comment.parent_id)
        parent.replies.push(comment)
    END IF

    // Trigger state update
    CALL UpdateState()
END

ALGORITHM: ReplaceOptimisticComment
INPUT: optimisticId (string), realComment (Comment)
OUTPUT: void

BEGIN
    // Find optimistic comment
    optimisticComment ← state.commentMap.get(optimisticId)

    IF optimisticComment = null THEN
        RETURN
    END IF

    // Update comments array
    index ← state.comments.findIndex(c => c.id = optimisticId)
    IF index ≠ -1 THEN
        state.comments[index] ← {
            ...realComment,
            replies: optimisticComment.replies,
            depth: optimisticComment.depth
        }
    END IF

    // Update comment map
    state.commentMap.delete(optimisticId)
    state.commentMap.set(realComment.id, realComment)

    // Update thread tree
    parent_id ← realComment.parent_id OR "root"
    IF state.threadTree.has(parent_id) THEN
        siblings ← state.threadTree.get(parent_id)
        siblingIndex ← siblings.findIndex(c => c.id = optimisticId)
        IF siblingIndex ≠ -1 THEN
            siblings[siblingIndex] ← state.commentMap.get(realComment.id)
        END IF
    END IF

    // Update parent's replies
    IF realComment.parent_id AND state.commentMap.has(realComment.parent_id) THEN
        parent ← state.commentMap.get(realComment.parent_id)
        replyIndex ← parent.replies.findIndex(c => c.id = optimisticId)
        IF replyIndex ≠ -1 THEN
            parent.replies[replyIndex] ← state.commentMap.get(realComment.id)
        END IF
    END IF

    // Trigger state update
    CALL UpdateState()
END

ALGORITHM: RemoveOptimisticComment
INPUT: optimisticId (string)
OUTPUT: void

BEGIN
    optimisticComment ← state.commentMap.get(optimisticId)

    IF optimisticComment = null THEN
        RETURN
    END IF

    // Remove from comments array
    state.comments ← state.comments.filter(c => c.id ≠ optimisticId)

    // Remove from comment map
    state.commentMap.delete(optimisticId)

    // Remove from thread tree
    parent_id ← optimisticComment.parent_id OR "root"
    IF state.threadTree.has(parent_id) THEN
        siblings ← state.threadTree.get(parent_id)
        state.threadTree.set(parent_id, siblings.filter(c => c.id ≠ optimisticId))
    END IF

    // Remove from parent's replies
    IF optimisticComment.parent_id AND state.commentMap.has(optimisticComment.parent_id) THEN
        parent ← state.commentMap.get(optimisticComment.parent_id)
        parent.replies ← parent.replies.filter(c => c.id ≠ optimisticId)
    END IF

    // Trigger state update
    CALL UpdateState()
END
```

### 1.6 Update Comment Algorithm

```
ALGORITHM: UpdateComment
INPUT: commentId (string), updates (object)
OUTPUT: Promise<Comment>

BEGIN
    // Validation
    IF NOT state.commentMap.has(commentId) THEN
        THROW NotFoundError("Comment not found")
    END IF

    comment ← state.commentMap.get(commentId)

    IF comment.author_id ≠ currentUser.id THEN
        THROW PermissionError("You can only edit your own comments")
    END IF

    IF updates.content AND updates.content.trim().length = 0 THEN
        THROW ValidationError("Comment content cannot be empty")
    END IF

    // Store original for rollback
    originalComment ← { ...comment }
    operationId ← GenerateUUID()

    // Optimistic update
    IF config.enableOptimistic AND updates.content THEN
        comment.content ← updates.content
        comment.updated_at ← NOW()
        state.optimisticOperations.add(operationId)
        CALL UpdateState()
    END IF

    TRY
        // API call
        response ← AWAIT API.PATCH("/api/comments/" + commentId, {
            body: updates,
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + authToken
            }
        })

        IF response.status ≠ 200 THEN
            THROW Error("Failed to update comment: " + response.statusText)
        END IF

        updatedComment ← response.data.comment

        // Update state with server response
        CALL UpdateCommentInState(commentId, updatedComment)
        state.optimisticOperations.delete(operationId)

        RETURN updatedComment

    CATCH error
        // Rollback optimistic update
        IF config.enableOptimistic THEN
            CALL UpdateCommentInState(commentId, originalComment)
            state.optimisticOperations.delete(operationId)
        END IF

        // Error handling
        IF error.status = 401 THEN
            CALL HandleAuthError()
        ELSE IF error.status = 403 THEN
            THROW PermissionError("You don't have permission to edit this comment")
        ELSE IF error.status = 404 THEN
            THROW NotFoundError("Comment not found")
        ELSE IF error.status = 400 THEN
            THROW ValidationError(error.data.message OR "Invalid comment data")
        ELSE
            THROW Error("Failed to update comment: " + error.message)
        END IF

        THROW error
    END TRY
END

ALGORITHM: UpdateCommentInState
INPUT: commentId (string), updatedData (object)
OUTPUT: void

BEGIN
    IF NOT state.commentMap.has(commentId) THEN
        RETURN
    END IF

    comment ← state.commentMap.get(commentId)

    // Update comment object
    FOR EACH key, value IN updatedData DO
        comment[key] ← value
    END FOR

    // Update in comments array
    index ← state.comments.findIndex(c => c.id = commentId)
    IF index ≠ -1 THEN
        state.comments[index] ← comment
    END IF

    // Trigger state update
    CALL UpdateState()
END
```

### 1.7 Delete Comment Algorithm

```
ALGORITHM: DeleteComment
INPUT: commentId (string)
OUTPUT: Promise<void>

BEGIN
    // Validation
    IF NOT state.commentMap.has(commentId) THEN
        THROW NotFoundError("Comment not found")
    END IF

    comment ← state.commentMap.get(commentId)

    IF comment.author_id ≠ currentUser.id AND NOT currentUser.is_admin THEN
        THROW PermissionError("You can only delete your own comments")
    END IF

    // Store original for rollback
    originalComment ← { ...comment }
    operationId ← GenerateUUID()

    // Optimistic deletion (soft delete)
    IF config.enableOptimistic THEN
        hasReplies ← comment.replies.length > 0

        IF hasReplies THEN
            // Soft delete - mark as deleted but keep structure
            comment.content ← "[deleted]"
            comment.deleted_at ← NOW()
        ELSE
            // Hard delete - remove from state
            CALL RemoveCommentFromState(commentId)
        END IF

        state.optimisticOperations.add(operationId)
        CALL UpdateState()
    END IF

    TRY
        // API call
        response ← AWAIT API.DELETE("/api/comments/" + commentId, {
            headers: {
                "Authorization": "Bearer " + authToken
            }
        })

        IF response.status ≠ 200 AND response.status ≠ 204 THEN
            THROW Error("Failed to delete comment: " + response.statusText)
        END IF

        // Server confirms deletion
        hasReplies ← originalComment.replies.length > 0

        IF hasReplies THEN
            // Update with deleted marker
            CALL UpdateCommentInState(commentId, {
                content: "[deleted]",
                deleted_at: NOW()
            })
        ELSE
            // Remove completely
            CALL RemoveCommentFromState(commentId)
        END IF

        state.optimisticOperations.delete(operationId)

    CATCH error
        // Rollback optimistic deletion
        IF config.enableOptimistic THEN
            CALL UpdateCommentInState(commentId, originalComment)
            state.optimisticOperations.delete(operationId)
        END IF

        // Error handling
        IF error.status = 401 THEN
            CALL HandleAuthError()
        ELSE IF error.status = 403 THEN
            THROW PermissionError("You don't have permission to delete this comment")
        ELSE IF error.status = 404 THEN
            THROW NotFoundError("Comment not found")
        ELSE
            THROW Error("Failed to delete comment: " + error.message)
        END IF

        THROW error
    END TRY
END

ALGORITHM: RemoveCommentFromState
INPUT: commentId (string)
OUTPUT: void

BEGIN
    comment ← state.commentMap.get(commentId)

    IF comment = null THEN
        RETURN
    END IF

    // Remove from comments array
    state.comments ← state.comments.filter(c => c.id ≠ commentId)

    // Remove from comment map
    state.commentMap.delete(commentId)

    // Remove from thread tree
    parent_id ← comment.parent_id OR "root"
    IF state.threadTree.has(parent_id) THEN
        siblings ← state.threadTree.get(parent_id)
        state.threadTree.set(parent_id, siblings.filter(c => c.id ≠ commentId))
    END IF

    // Remove from parent's replies
    IF comment.parent_id AND state.commentMap.has(comment.parent_id) THEN
        parent ← state.commentMap.get(comment.parent_id)
        parent.replies ← parent.replies.filter(c => c.id ≠ commentId)
    END IF

    // Remove from thread tree as parent
    state.threadTree.delete(commentId)

    // Trigger state update
    CALL UpdateState()
END
```

### 1.8 React to Comment Algorithm

```
ALGORITHM: ReactToComment
INPUT: commentId (string), reaction (string)
OUTPUT: Promise<void>

BEGIN
    // Validation
    IF NOT state.commentMap.has(commentId) THEN
        THROW NotFoundError("Comment not found")
    END IF

    validReactions ← ["like", "love", "laugh", "wow", "sad", "angry"]
    IF reaction NOT IN validReactions THEN
        THROW ValidationError("Invalid reaction type")
    END IF

    comment ← state.commentMap.get(commentId)
    previousReaction ← comment.user_reaction
    operationId ← GenerateUUID()

    // Optimistic update
    IF config.enableOptimistic THEN
        // Remove previous reaction count
        IF previousReaction ≠ null THEN
            currentCount ← comment.reaction_counts[previousReaction] OR 0
            comment.reaction_counts[previousReaction] ← MAX(0, currentCount - 1)
        END IF

        // Add new reaction or toggle off
        IF reaction = previousReaction THEN
            // Toggle off - remove reaction
            comment.user_reaction ← null
        ELSE
            // Add new reaction
            comment.user_reaction ← reaction
            currentCount ← comment.reaction_counts[reaction] OR 0
            comment.reaction_counts[reaction] ← currentCount + 1
        END IF

        state.optimisticOperations.add(operationId)
        CALL UpdateState()
    END IF

    TRY
        // Determine API action
        IF reaction = previousReaction THEN
            // Remove reaction
            response ← AWAIT API.DELETE("/api/comments/" + commentId + "/reactions", {
                headers: {
                    "Authorization": "Bearer " + authToken
                }
            })
        ELSE
            // Add or change reaction
            response ← AWAIT API.POST("/api/comments/" + commentId + "/reactions", {
                body: { reaction: reaction },
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + authToken
                }
            })
        END IF

        IF response.status ≠ 200 AND response.status ≠ 201 THEN
            THROW Error("Failed to update reaction: " + response.statusText)
        END IF

        // Update with server response
        updatedReactionData ← response.data
        comment.reaction_counts ← updatedReactionData.reaction_counts
        comment.user_reaction ← updatedReactionData.user_reaction

        state.optimisticOperations.delete(operationId)
        CALL UpdateState()

    CATCH error
        // Rollback optimistic update
        IF config.enableOptimistic THEN
            comment.user_reaction ← previousReaction

            // Recalculate reaction counts from server or original state
            // This requires storing original counts or fetching from server
            CALL RefreshCommentReactions(commentId)

            state.optimisticOperations.delete(operationId)
        END IF

        // Error handling
        IF error.status = 401 THEN
            CALL HandleAuthError()
        ELSE IF error.status = 404 THEN
            THROW NotFoundError("Comment not found")
        ELSE
            THROW Error("Failed to update reaction: " + error.message)
        END IF

        THROW error
    END TRY
END
```

---

## Algorithm 2: useRealtimeComments Hook

### 2.1 WebSocket Connection Management

```
ALGORITHM: InitializeRealtimeComments
INPUT: postId (string), commentState (CommentState)
OUTPUT: WebSocket connection and cleanup function

BEGIN
    wsConnection ← null
    reconnectAttempts ← 0
    maxReconnectAttempts ← 5
    reconnectDelay ← 1000
    heartbeatInterval ← 30000
    heartbeatTimer ← null

    // Connect to WebSocket
    FUNCTION Connect():
        TRY
            // Build WebSocket URL
            wsUrl ← BuildWebSocketURL("/api/realtime/comments", {
                post_id: postId,
                token: authToken
            })

            wsConnection ← new WebSocket(wsUrl)

            // Set up event handlers
            wsConnection.onopen ← OnOpen
            wsConnection.onmessage ← OnMessage
            wsConnection.onerror ← OnError
            wsConnection.onclose ← OnClose

        CATCH error
            CALL LogError("WebSocket connection failed", error)
            CALL ScheduleReconnect()
        END TRY
    END FUNCTION

    // Initialize connection
    CALL Connect()

    // Cleanup function
    FUNCTION Cleanup():
        IF heartbeatTimer ≠ null THEN
            ClearInterval(heartbeatTimer)
        END IF

        IF wsConnection ≠ null THEN
            wsConnection.close(1000, "Component unmounted")
            wsConnection ← null
        END IF
    END FUNCTION

    RETURN {
        connection: wsConnection,
        cleanup: Cleanup,
        reconnect: Connect
    }
END
```

### 2.2 WebSocket Event Handlers

```
ALGORITHM: OnOpen
INPUT: event (WebSocketEvent)
OUTPUT: void

BEGIN
    CALL LogInfo("WebSocket connected for post: " + postId)

    // Reset reconnect attempts
    reconnectAttempts ← 0

    // Send subscription message
    subscriptionMessage ← {
        type: "SUBSCRIBE",
        payload: {
            post_id: postId,
            events: ["comment:added", "comment:updated", "comment:deleted", "comment:reacted"]
        }
    }

    wsConnection.send(JSON.stringify(subscriptionMessage))

    // Start heartbeat
    heartbeatTimer ← SetInterval(FUNCTION():
        IF wsConnection.readyState = WebSocket.OPEN THEN
            wsConnection.send(JSON.stringify({ type: "PING" }))
        END IF
    END FUNCTION, heartbeatInterval)

    // Notify connection status
    CALL UpdateConnectionStatus("connected")
END

ALGORITHM: OnMessage
INPUT: event (WebSocketMessageEvent)
OUTPUT: void

BEGIN
    TRY
        message ← JSON.parse(event.data)

        // Handle different message types
        SWITCH message.type
            CASE "PONG":
                // Heartbeat response - do nothing
                BREAK

            CASE "COMMENT_ADDED":
                CALL HandleCommentAdded(message.payload)
                BREAK

            CASE "COMMENT_UPDATED":
                CALL HandleCommentUpdated(message.payload)
                BREAK

            CASE "COMMENT_DELETED":
                CALL HandleCommentDeleted(message.payload)
                BREAK

            CASE "COMMENT_REACTED":
                CALL HandleCommentReacted(message.payload)
                BREAK

            CASE "ERROR":
                CALL LogError("WebSocket error message", message.payload)
                BREAK

            DEFAULT:
                CALL LogWarning("Unknown message type: " + message.type)
        END SWITCH

    CATCH error
        CALL LogError("Failed to parse WebSocket message", error)
    END TRY
END

ALGORITHM: OnError
INPUT: event (WebSocketErrorEvent)
OUTPUT: void

BEGIN
    CALL LogError("WebSocket error", event)
    CALL UpdateConnectionStatus("error")
END

ALGORITHM: OnClose
INPUT: event (WebSocketCloseEvent)
OUTPUT: void

BEGIN
    CALL LogInfo("WebSocket closed: " + event.code + " - " + event.reason)
    CALL UpdateConnectionStatus("disconnected")

    // Clear heartbeat
    IF heartbeatTimer ≠ null THEN
        ClearInterval(heartbeatTimer)
        heartbeatTimer ← null
    END IF

    // Attempt reconnection if not intentional close
    IF event.code ≠ 1000 AND event.code ≠ 1001 THEN
        CALL ScheduleReconnect()
    END IF
END
```

### 2.3 Reconnection Logic

```
ALGORITHM: ScheduleReconnect
INPUT: none
OUTPUT: void

BEGIN
    IF reconnectAttempts >= maxReconnectAttempts THEN
        CALL LogError("Max reconnection attempts reached")
        CALL UpdateConnectionStatus("failed")
        RETURN
    END IF

    reconnectAttempts ← reconnectAttempts + 1

    // Exponential backoff
    delay ← reconnectDelay * Math.pow(2, reconnectAttempts - 1)

    CALL LogInfo("Scheduling reconnect attempt " + reconnectAttempts + " in " + delay + "ms")
    CALL UpdateConnectionStatus("reconnecting")

    SetTimeout(FUNCTION():
        CALL Connect()
    END FUNCTION, delay)
END
```

### 2.4 Real-time Event Handlers

```
ALGORITHM: HandleCommentAdded
INPUT: payload (object)
OUTPUT: void

BEGIN
    newComment ← payload.comment

    // Check if this is from the current user's optimistic update
    IF state.optimisticOperations.size > 0 THEN
        // Check if we have an optimistic comment matching this
        FOR EACH optimisticComment IN state.comments DO
            IF optimisticComment.is_optimistic AND
               optimisticComment.content = newComment.content AND
               optimisticComment.parent_id = newComment.parent_id THEN
                // Replace optimistic with real
                CALL ReplaceOptimisticComment(optimisticComment.id, newComment)
                RETURN
            END IF
        END FOR
    END IF

    // Check if comment already exists (avoid duplicates)
    IF state.commentMap.has(newComment.id) THEN
        RETURN
    END IF

    // Add new comment to state
    CALL AddCommentToState(newComment)

    // Show notification if from another user
    IF newComment.author_id ≠ currentUser.id THEN
        IF newComment.parent_id THEN
            // Reply to a comment
            parentComment ← state.commentMap.get(newComment.parent_id)
            IF parentComment AND parentComment.author_id = currentUser.id THEN
                CALL ShowNotification("New reply to your comment")
            END IF
        ELSE
            // New root comment
            CALL ShowNotification("New comment on post")
        END IF
    END IF
END

ALGORITHM: HandleCommentUpdated
INPUT: payload (object)
OUTPUT: void

BEGIN
    updatedComment ← payload.comment
    commentId ← updatedComment.id

    // Check if this is from current user's optimistic update
    IF state.optimisticOperations.size > 0 THEN
        // Allow server update to complete the optimistic operation
        FOR EACH operationId IN state.optimisticOperations DO
            // Match by timestamp proximity or other heuristics
            // If matched, the optimistic operation is confirmed
        END FOR
    END IF

    // Check if comment exists
    IF NOT state.commentMap.has(commentId) THEN
        // Comment might have been deleted locally, fetch it
        CALL FetchSingleComment(commentId)
        RETURN
    END IF

    // Update comment in state
    CALL UpdateCommentInState(commentId, updatedComment)
END

ALGORITHM: HandleCommentDeleted
INPUT: payload (object)
OUTPUT: void

BEGIN
    commentId ← payload.comment_id
    hasReplies ← payload.has_replies

    // Check if this is from current user's optimistic update
    IF state.optimisticOperations.size > 0 THEN
        // Allow server deletion to complete the optimistic operation
    END IF

    // Check if comment exists
    IF NOT state.commentMap.has(commentId) THEN
        RETURN
    END IF

    IF hasReplies THEN
        // Soft delete - mark as deleted
        CALL UpdateCommentInState(commentId, {
            content: "[deleted]",
            deleted_at: NOW()
        })
    ELSE
        // Hard delete - remove from state
        CALL RemoveCommentFromState(commentId)
    END IF
END

ALGORITHM: HandleCommentReacted
INPUT: payload (object)
OUTPUT: void

BEGIN
    commentId ← payload.comment_id
    reactionCounts ← payload.reaction_counts
    userReaction ← payload.user_reaction
    userId ← payload.user_id

    // Check if comment exists
    IF NOT state.commentMap.has(commentId) THEN
        RETURN
    END IF

    comment ← state.commentMap.get(commentId)

    // Update reaction counts
    comment.reaction_counts ← reactionCounts

    // Update user's own reaction if this event is for current user
    IF userId = currentUser.id THEN
        comment.user_reaction ← userReaction
    END IF

    CALL UpdateState()
END
```

### 2.5 Helper Functions

```
ALGORITHM: AddCommentToState
INPUT: comment (Comment)
OUTPUT: void

BEGIN
    // Add to comments array (maintain sort order by created_at)
    insertIndex ← state.comments.findIndex(c => c.created_at > comment.created_at)
    IF insertIndex = -1 THEN
        state.comments.push(comment)
    ELSE
        state.comments.splice(insertIndex, 0, comment)
    END IF

    // Calculate depth
    depth ← 0
    IF comment.parent_id AND state.commentMap.has(comment.parent_id) THEN
        parent ← state.commentMap.get(comment.parent_id)
        depth ← parent.depth + 1
    END IF

    // Add to comment map
    comment.depth ← depth
    comment.replies ← []
    state.commentMap.set(comment.id, comment)

    // Add to thread tree
    parent_id ← comment.parent_id OR "root"
    IF NOT state.threadTree.has(parent_id) THEN
        state.threadTree.set(parent_id, [])
    END IF
    state.threadTree.get(parent_id).push(comment)

    // Add to parent's replies
    IF comment.parent_id AND state.commentMap.has(comment.parent_id) THEN
        parent ← state.commentMap.get(comment.parent_id)
        parent.replies.push(comment)
    END IF

    CALL UpdateState()
END

ALGORITHM: BuildWebSocketURL
INPUT: path (string), params (object)
OUTPUT: string (WebSocket URL)

BEGIN
    // Get base URL
    protocol ← window.location.protocol = "https:" ? "wss:" : "ws:"
    host ← window.location.host
    baseUrl ← protocol + "//" + host + path

    // Add query parameters
    queryString ← ""
    FOR EACH key, value IN params DO
        IF queryString.length > 0 THEN
            queryString ← queryString + "&"
        END IF
        queryString ← queryString + key + "=" + encodeURIComponent(value)
    END FOR

    IF queryString.length > 0 THEN
        baseUrl ← baseUrl + "?" + queryString
    END IF

    RETURN baseUrl
END

ALGORITHM: UpdateConnectionStatus
INPUT: status (string)
OUTPUT: void

BEGIN
    // Update connection status in state or context
    connectionStatus ← status

    // Emit event for UI components to react
    CALL EmitEvent("connection:status", { status: status })

    // Update visual indicators
    IF status = "connected" THEN
        CALL HideConnectionWarning()
    ELSE IF status = "reconnecting" OR status = "disconnected" THEN
        CALL ShowConnectionWarning("Reconnecting...")
    ELSE IF status = "failed" THEN
        CALL ShowConnectionError("Connection failed. Please refresh.")
    END IF
END
```

---

## Algorithm 3: Error Handling and Retry Logic

### 3.1 Error Classification

```
ALGORITHM: ClassifyError
INPUT: error (Error)
OUTPUT: ErrorType

BEGIN
    // Network errors
    IF error.code = "ECONNREFUSED" OR
       error.code = "ETIMEDOUT" OR
       error.code = "ENETUNREACH" OR
       error.message.contains("Network") THEN
        RETURN "NETWORK_ERROR"
    END IF

    // Authentication errors
    IF error.status = 401 THEN
        RETURN "AUTH_ERROR"
    END IF

    // Permission errors
    IF error.status = 403 THEN
        RETURN "PERMISSION_ERROR"
    END IF

    // Not found errors
    IF error.status = 404 THEN
        RETURN "NOT_FOUND_ERROR"
    END IF

    // Validation errors
    IF error.status = 400 OR error.status = 422 THEN
        RETURN "VALIDATION_ERROR"
    END IF

    // Rate limit errors
    IF error.status = 429 THEN
        RETURN "RATE_LIMIT_ERROR"
    END IF

    // Server errors
    IF error.status >= 500 THEN
        RETURN "SERVER_ERROR"
    END IF

    // Unknown errors
    RETURN "UNKNOWN_ERROR"
END
```

### 3.2 Retry Strategy

```
ALGORITHM: ShouldRetry
INPUT: error (Error), attemptNumber (integer)
OUTPUT: boolean

BEGIN
    errorType ← CALL ClassifyError(error)

    // Don't retry these error types
    IF errorType IN ["AUTH_ERROR", "PERMISSION_ERROR", "VALIDATION_ERROR", "NOT_FOUND_ERROR"] THEN
        RETURN false
    END IF

    // Retry network and server errors
    IF errorType IN ["NETWORK_ERROR", "SERVER_ERROR", "RATE_LIMIT_ERROR"] THEN
        IF attemptNumber < config.retryAttempts THEN
            RETURN true
        END IF
    END IF

    RETURN false
END

ALGORITHM: CalculateRetryDelay
INPUT: attemptNumber (integer), errorType (ErrorType)
OUTPUT: integer (delay in milliseconds)

BEGIN
    baseDelay ← config.retryDelay

    // Special handling for rate limits
    IF errorType = "RATE_LIMIT_ERROR" THEN
        // Longer delay for rate limits
        RETURN baseDelay * Math.pow(2, attemptNumber) * 2
    END IF

    // Exponential backoff with jitter
    exponentialDelay ← baseDelay * Math.pow(2, attemptNumber)
    jitter ← Math.random() * 0.3 * exponentialDelay

    RETURN exponentialDelay + jitter
END

ALGORITHM: RetryOperation
INPUT: operation (Function), maxAttempts (integer), context (object)
OUTPUT: Promise<Result>

BEGIN
    attemptNumber ← 0
    lastError ← null

    WHILE attemptNumber < maxAttempts DO
        TRY
            result ← AWAIT operation(context)
            RETURN result

        CATCH error
            lastError ← error
            attemptNumber ← attemptNumber + 1

            shouldRetry ← CALL ShouldRetry(error, attemptNumber)

            IF NOT shouldRetry THEN
                THROW error
            END IF

            IF attemptNumber < maxAttempts THEN
                errorType ← CALL ClassifyError(error)
                delay ← CALL CalculateRetryDelay(attemptNumber, errorType)

                CALL LogInfo("Retrying operation (attempt " + attemptNumber + ") after " + delay + "ms")

                AWAIT Sleep(delay)
            END IF
        END TRY
    END WHILE

    THROW lastError
END
```

### 3.3 Error Recovery

```
ALGORITHM: HandleAuthError
INPUT: none
OUTPUT: void

BEGIN
    // Clear user session
    CALL ClearAuthToken()

    // Close WebSocket connection
    IF wsConnection ≠ null THEN
        wsConnection.close(1000, "Authentication expired")
    END IF

    // Redirect to login or show auth modal
    CALL ShowAuthenticationModal()

    // Emit event for app-level handling
    CALL EmitEvent("auth:expired")
END

ALGORITHM: RecoverFromError
INPUT: error (Error), context (object)
OUTPUT: void

BEGIN
    errorType ← CALL ClassifyError(error)

    SWITCH errorType
        CASE "NETWORK_ERROR":
            // Show offline indicator
            CALL ShowNetworkErrorToast("Network connection lost. Retrying...")
            // Keep optimistic updates in place
            BREAK

        CASE "AUTH_ERROR":
            CALL HandleAuthError()
            BREAK

        CASE "RATE_LIMIT_ERROR":
            CALL ShowRateLimitToast("Too many requests. Please slow down.")
            // Disable comment input temporarily
            CALL DisableCommentInput(30000) // 30 seconds
            BREAK

        CASE "SERVER_ERROR":
            CALL ShowErrorToast("Server error. Please try again.")
            // Remove optimistic updates
            CALL ClearOptimisticOperations()
            BREAK

        CASE "VALIDATION_ERROR":
            CALL ShowValidationError(error.message)
            // Remove invalid optimistic update
            IF context.optimisticId THEN
                CALL RemoveOptimisticComment(context.optimisticId)
            END IF
            BREAK

        DEFAULT:
            CALL ShowGenericError("An error occurred. Please try again.")
    END SWITCH
END
```

---

## Algorithm 4: Loading State Management

### 4.1 Loading State Types

```
STRUCTURE: LoadingState
    global: boolean              // Overall loading (initial fetch)
    operations: Map<operation_id, LoadingOperation>

STRUCTURE: LoadingOperation
    id: string
    type: enum (ADD, UPDATE, DELETE, REACT)
    target_id: string or null
    started_at: timestamp
    is_optimistic: boolean
```

### 4.2 Loading State Management

```
ALGORITHM: StartLoading
INPUT: operationType (string), targetId (string or null)
OUTPUT: operation_id (string)

BEGIN
    operation_id ← GenerateUUID()

    loadingOperation ← {
        id: operation_id,
        type: operationType,
        target_id: targetId,
        started_at: NOW(),
        is_optimistic: config.enableOptimistic
    }

    state.loadingOperations.set(operation_id, loadingOperation)

    // Update global loading state
    IF state.loadingOperations.size = 1 THEN
        state.loading ← true
    END IF

    CALL UpdateState()

    RETURN operation_id
END

ALGORITHM: FinishLoading
INPUT: operation_id (string)
OUTPUT: void

BEGIN
    IF NOT state.loadingOperations.has(operation_id) THEN
        RETURN
    END IF

    state.loadingOperations.delete(operation_id)

    // Update global loading state
    IF state.loadingOperations.size = 0 THEN
        state.loading ← false
    END IF

    CALL UpdateState()
END

ALGORITHM: IsCommentLoading
INPUT: commentId (string)
OUTPUT: boolean

BEGIN
    FOR EACH operation IN state.loadingOperations.values() DO
        IF operation.target_id = commentId THEN
            RETURN true
        END IF
    END FOR

    RETURN false
END

ALGORITHM: GetOperationStatus
INPUT: operation_id (string)
OUTPUT: LoadingOperation or null

BEGIN
    IF state.loadingOperations.has(operation_id) THEN
        RETURN state.loadingOperations.get(operation_id)
    END IF

    RETURN null
END
```

### 4.3 Timeout Handling

```
ALGORITHM: SetOperationTimeout
INPUT: operation_id (string), timeout (integer)
OUTPUT: void

BEGIN
    SetTimeout(FUNCTION():
        operation ← CALL GetOperationStatus(operation_id)

        IF operation ≠ null THEN
            // Operation still pending after timeout
            CALL LogWarning("Operation timeout: " + operation.type + " for " + operation.target_id)

            // Clean up loading state
            CALL FinishLoading(operation_id)

            // Show timeout error
            CALL ShowTimeoutError("Operation took too long. Please try again.")

            // Clean up optimistic updates
            IF operation.is_optimistic AND operation.target_id THEN
                SWITCH operation.type
                    CASE "ADD":
                        CALL RemoveOptimisticComment(operation.target_id)
                        BREAK
                    CASE "DELETE":
                        // Restore deleted comment
                        CALL RefreshComments()
                        BREAK
                END SWITCH
            END IF
        END IF
    END FUNCTION, timeout)
END
```

---

## Complexity Analysis

### Time Complexity

**useCommentThreading Hook:**
- `FetchComments`: O(n log n) where n = number of comments
  - API call: O(1)
  - Building comment map: O(n)
  - Building thread tree: O(n)
  - Calculating depths (recursive): O(n)
  - Sorting operations: O(n log n)

- `AddComment`: O(log n) amortized
  - API call: O(1)
  - Optimistic insert: O(log n) for sorted insert
  - State update: O(1)

- `UpdateComment`: O(1)
  - API call: O(1)
  - State update: O(1)

- `DeleteComment`: O(1) or O(d) where d = depth
  - API call: O(1)
  - State update: O(1)
  - Tree restructuring: O(d) in worst case

- `ReactToComment`: O(1)
  - API call: O(1)
  - State update: O(1)

**useRealtimeComments Hook:**
- `HandleCommentAdded`: O(log n) for sorted insert
- `HandleCommentUpdated`: O(1)
- `HandleCommentDeleted`: O(1) or O(d)
- `HandleCommentReacted`: O(1)

### Space Complexity

**useCommentThreading Hook:**
- Comment storage: O(n) where n = number of comments
- Comment map: O(n)
- Thread tree: O(n)
- Optimistic operations: O(m) where m = pending operations (typically small)
- Total: O(n)

**useRealtimeComments Hook:**
- WebSocket connection: O(1)
- Message queue: O(k) where k = queued messages (typically small)
- Total: O(1)

### Optimization Notes

1. **Lazy Loading**: Implement pagination for large comment threads
2. **Virtualization**: Only render visible comments in UI
3. **Debouncing**: Debounce reaction updates to reduce API calls
4. **Caching**: Cache comment trees to avoid rebuilding on every update
5. **Batching**: Batch multiple WebSocket events for more efficient updates
6. **Index Optimization**: Use Map data structure for O(1) comment lookup
7. **Tree Flattening**: Consider flattening deep threads beyond maxDepth

---

## Design Patterns Used

1. **Observer Pattern**: WebSocket event handling and state updates
2. **Optimistic UI Pattern**: Immediate UI updates before API confirmation
3. **Retry Pattern**: Exponential backoff for failed operations
4. **State Management Pattern**: Centralized state with derived data structures
5. **Command Pattern**: Encapsulated operations (add, update, delete, react)
6. **Factory Pattern**: Comment object creation with consistent structure
7. **Strategy Pattern**: Different error handling strategies by error type

---

## Next Steps

1. **Architecture Phase**: Design React hook structure and component integration
2. **API Design**: Define REST and WebSocket API endpoints
3. **Database Schema**: Design comment storage with parent_id relationships
4. **Testing Strategy**: Unit tests for algorithms, integration tests for hooks
5. **Performance Testing**: Load testing with large comment threads
6. **Security Review**: Input validation, XSS prevention, rate limiting

---

## References

- SPARC Methodology: Specification → Pseudocode → Architecture → Refinement → Completion
- React Hooks Best Practices
- WebSocket Protocol Specification
- Optimistic UI Patterns
- Error Handling Patterns in Distributed Systems
