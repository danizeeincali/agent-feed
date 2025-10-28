# SPARC Specification: Comment Threading Hooks Implementation

## Document Information

- **Project**: Agent Feed - Comment Threading System
- **Phase**: Specification
- **Version**: 1.0.0
- **Date**: 2025-10-26
- **Status**: Draft

## Executive Summary

This specification defines the requirements for implementing two critical React hooks (`useCommentThreading` and `useRealtimeComments`) that power the comment reply functionality in the Agent Feed application. These hooks are currently missing, causing the comment system to fail when users attempt to reply to comments.

## 1. Problem Statement

### 1.1 Current State

The comment system UI exists but is non-functional due to missing hook implementations:
- `CommentSystem.tsx` (lines 75-89) imports and uses `useCommentThreading`
- `CommentSystem.tsx` (lines 92-103) imports and uses `useRealtimeComments`
- Both hooks do not exist in `/workspaces/agent-feed/frontend/src/hooks/`
- Comment replies fail silently when users attempt to interact

### 1.2 Root Cause

Investigation revealed:
1. Backend API endpoints exist and are functional (POST /api/agent-posts/:postId/comments)
2. Database schema supports threading (parent_id field exists)
3. WebSocket service is initialized and operational
4. Only the React hooks layer is missing

### 1.3 Impact

- Users cannot reply to comments
- No real-time comment updates
- Comment threading UI is non-functional
- Agent interactions with comments are broken

## 2. Functional Requirements

### 2.1 useCommentThreading Hook

**FR-2.1.1**: Comment State Management
- **Priority**: Critical
- **Description**: Hook SHALL manage the complete state of comments for a post
- **Acceptance Criteria**:
  - Maintains array of CommentTreeNode objects
  - Tracks loading states (idle, loading, success, error)
  - Manages error states with descriptive messages
  - Provides comment statistics (total, depth, reply counts)

**FR-2.1.2**: Comment CRUD Operations
- **Priority**: Critical
- **Description**: Hook SHALL provide functions for creating, reading, updating, and deleting comments
- **Acceptance Criteria**:
  - `addComment(content: string, parentId?: string)` creates new comments
  - `updateComment(commentId: string, content: string)` updates existing comments
  - `deleteComment(commentId: string)` removes comments (soft delete)
  - `refreshComments()` reloads all comments from server
  - All operations return Promises that resolve/reject appropriately

**FR-2.1.3**: Comment Reactions
- **Priority**: High
- **Description**: Hook SHALL support user reactions to comments
- **Acceptance Criteria**:
  - `reactToComment(commentId: string, reactionType: string)` adds/removes reactions
  - Supports multiple reaction types (like, heart, thumbsup)
  - Tracks user's own reactions
  - Updates reaction counts in real-time

**FR-2.1.4**: Thread Structure Management
- **Priority**: High
- **Description**: Hook SHALL provide thread hierarchy utilities
- **Acceptance Criteria**:
  - `getThreadStructure()` returns nested comment tree
  - Calculates thread depth for each comment
  - Generates thread paths (e.g., "0/1/3")
  - Respects maxDepth configuration

**FR-2.1.5**: Pagination Support
- **Priority**: Medium
- **Description**: Hook SHALL support loading comments in batches
- **Acceptance Criteria**:
  - `loadMoreComments(page: number)` loads additional comments
  - Tracks current page and hasMore state
  - Configurable page size
  - Maintains scroll position during loads

**FR-2.1.6**: Agent Interaction Support
- **Priority**: High
- **Description**: Hook SHALL support triggering agent responses
- **Acceptance Criteria**:
  - `triggerAgentResponse(commentId: string, agentType: string)` initiates agent response
  - Tracks agent conversations
  - Returns agent conversation metadata
  - Supports filtering by agent conversation

**FR-2.1.7**: Comment Statistics
- **Priority**: Low
- **Description**: Hook SHALL provide comment statistics
- **Acceptance Criteria**:
  - Total comment count
  - Maximum thread depth
  - Reply counts per comment
  - Reaction counts per comment

### 2.2 useRealtimeComments Hook

**FR-2.2.1**: WebSocket Connection Management
- **Priority**: Critical
- **Description**: Hook SHALL manage WebSocket connection for real-time updates
- **Acceptance Criteria**:
  - Connects to WebSocket service on mount
  - Subscribes to post-specific channel (`post:${postId}`)
  - Handles connection/disconnection gracefully
  - Cleans up on unmount

**FR-2.2.2**: Real-Time Event Handling
- **Priority**: Critical
- **Description**: Hook SHALL handle real-time comment events
- **Acceptance Criteria**:
  - Listens for `comment:added` events
  - Listens for `comment:updated` events
  - Listens for `comment:deleted` events
  - Listens for `comment:reaction` events
  - Listens for `agent:response` events

**FR-2.2.3**: Callback Integration
- **Priority**: High
- **Description**: Hook SHALL invoke user-provided callbacks for events
- **Acceptance Criteria**:
  - `onCommentAdded(comment: CommentTreeNode)` callback executed
  - `onCommentUpdated(comment: CommentTreeNode)` callback executed
  - `onCommentDeleted(commentId: string)` callback executed
  - `onAgentResponse(response: AgentResponse)` callback executed
  - All callbacks are optional

**FR-2.2.4**: Connection Status Tracking
- **Priority**: Medium
- **Description**: Hook SHALL expose connection status
- **Acceptance Criteria**:
  - Returns `isConnected: boolean` state
  - Returns `lastEventTime: string` timestamp
  - Provides reconnection status

**FR-2.2.5**: Enabled/Disabled Mode
- **Priority**: Medium
- **Description**: Hook SHALL support conditional activation
- **Acceptance Criteria**:
  - Accepts `enabled: boolean` option
  - Does not connect when disabled
  - Can be toggled dynamically

## 3. Non-Functional Requirements

### 3.1 Performance

**NFR-3.1.1**: Response Time
- **Description**: Hook operations SHALL complete within acceptable timeframes
- **Measurement**:
  - addComment: < 500ms (p95)
  - loadComments: < 1000ms (p95)
  - updateComment: < 500ms (p95)
  - WebSocket event processing: < 50ms

**NFR-3.1.2**: Memory Efficiency
- **Description**: Hooks SHALL not cause memory leaks
- **Validation**:
  - All event listeners cleaned up on unmount
  - No lingering WebSocket connections
  - Comment cache size limited (max 1000 comments)

**NFR-3.1.3**: Optimistic Updates
- **Description**: UI updates SHALL be optimistic for better UX
- **Implementation**:
  - Add comment updates state immediately
  - Rollback on API error
  - Show loading indicators for async operations

### 3.2 Reliability

**NFR-3.2.1**: Error Handling
- **Description**: All errors SHALL be caught and handled gracefully
- **Requirements**:
  - Network errors do not crash the UI
  - Invalid data is validated before state updates
  - User-friendly error messages
  - Retry logic for transient failures

**NFR-3.2.2**: Data Consistency
- **Description**: Comment state SHALL remain consistent
- **Requirements**:
  - Real-time updates reconciled with local state
  - No duplicate comments in state
  - Thread hierarchy integrity maintained
  - Race conditions prevented

**NFR-3.2.3**: Offline Resilience
- **Description**: Hooks SHALL handle offline scenarios
- **Requirements**:
  - Queue operations when offline
  - Sync when connection restored
  - Inform user of offline state

### 3.3 Security

**NFR-3.3.1**: Authentication
- **Description**: All API calls SHALL include authentication
- **Implementation**:
  - Send `x-user-id` header with requests
  - Handle 401 errors appropriately

**NFR-3.3.2**: Input Validation
- **Description**: All user input SHALL be validated
- **Requirements**:
  - Content length validation (max 10,000 chars)
  - HTML/XSS sanitization
  - Trim whitespace from content

**NFR-3.3.3**: Authorization
- **Description**: Users SHALL only modify their own comments
- **Requirements**:
  - Backend validates comment ownership
  - Hook respects backend authorization errors

### 3.4 Usability

**NFR-3.4.1**: Loading States
- **Description**: All async operations SHALL provide loading feedback
- **Implementation**:
  - Return loading boolean from hook
  - Support operation-specific loading states

**NFR-3.4.2**: Error Messages
- **Description**: Errors SHALL be user-friendly
- **Examples**:
  - "Failed to post comment. Please try again."
  - "Connection lost. Reconnecting..."
  - "This comment was deleted."

## 4. API Specifications

### 4.1 Backend REST Endpoints

#### 4.1.1 GET /api/agent-posts/:postId/comments

**Purpose**: Fetch all comments for a post

**Request**:
```http
GET /api/agent-posts/:postId/comments HTTP/1.1
x-user-id: user-123
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "comment-uuid",
      "post_id": "post-uuid",
      "content": "Great post!",
      "author": "user-123",
      "author_agent": "user-123",
      "parent_id": null,
      "created_at": "2025-10-26T10:00:00Z",
      "updated_at": "2025-10-26T10:00:00Z",
      "likes": 5,
      "mentioned_users": []
    }
  ],
  "total": 1,
  "timestamp": "2025-10-26T10:00:00Z",
  "source": "SQLite"
}
```

**Error Responses**:
- 500: Server error

#### 4.1.2 POST /api/agent-posts/:postId/comments

**Purpose**: Create a new comment

**Request**:
```http
POST /api/agent-posts/:postId/comments HTTP/1.1
Content-Type: application/json
x-user-id: user-123

{
  "content": "This is my reply",
  "author_agent": "user-123",
  "parent_id": "parent-comment-uuid",
  "mentioned_users": ["@agent1", "@user2"]
}
```

**Response** (201 Created):
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

**Error Responses**:
- 400: Missing required fields (content, author_agent)
- 500: Server error

#### 4.1.3 PUT /api/agent-posts/:postId/comments/:commentId/like

**Purpose**: Like/unlike a comment

**Request**:
```http
PUT /api/agent-posts/:postId/comments/:commentId/like HTTP/1.1
x-user-id: user-123
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "comment-uuid",
    "likes": 6
  },
  "message": "Comment liked successfully",
  "source": "SQLite"
}
```

**Error Responses**:
- 404: Comment not found
- 501: Not supported in PostgreSQL mode
- 503: Database not available

**Note**: Update and delete endpoints do not currently exist and are marked as future enhancements.

### 4.2 WebSocket Events

#### 4.2.1 Connection Events

**Event**: `connected`
```typescript
{
  message: "WebSocket connection established",
  timestamp: "2025-10-26T10:00:00Z"
}
```

#### 4.2.2 Subscription Events

**Client -> Server**: `subscribe:post`
```typescript
socket.emit('subscribe:post', 'post-uuid');
```

**Client -> Server**: `unsubscribe:post`
```typescript
socket.emit('unsubscribe:post', 'post-uuid');
```

#### 4.2.3 Comment Events (Proposed)

**Server -> Client**: `comment:added`
```typescript
{
  type: "comment:added",
  data: {
    id: "comment-uuid",
    post_id: "post-uuid",
    content: "New comment",
    author: "user-123",
    author_agent: "user-123",
    parent_id: null,
    created_at: "2025-10-26T10:05:00Z",
    likes: 0,
    mentioned_users: []
  },
  timestamp: "2025-10-26T10:05:00Z"
}
```

**Server -> Client**: `comment:updated`
```typescript
{
  type: "comment:updated",
  data: {
    id: "comment-uuid",
    content: "Updated content",
    updated_at: "2025-10-26T10:06:00Z"
  },
  timestamp: "2025-10-26T10:06:00Z"
}
```

**Server -> Client**: `comment:deleted`
```typescript
{
  type: "comment:deleted",
  data: {
    id: "comment-uuid",
    post_id: "post-uuid"
  },
  timestamp: "2025-10-26T10:07:00Z"
}
```

**Server -> Client**: `comment:reaction`
```typescript
{
  type: "comment:reaction",
  data: {
    id: "comment-uuid",
    reaction_type: "like",
    likes: 7,
    user_id: "user-456"
  },
  timestamp: "2025-10-26T10:08:00Z"
}
```

**Server -> Client**: `agent:response`
```typescript
{
  type: "agent:response",
  data: {
    conversation_id: "conv-uuid",
    comment_id: "comment-uuid",
    agent_type: "link-logger-agent",
    status: "processing" | "completed" | "failed"
  },
  timestamp: "2025-10-26T10:09:00Z"
}
```

**Note**: These WebSocket events do not currently exist in the backend and must be added to `websocket-service.js`.

## 5. TypeScript Type Definitions

### 5.1 Core Types

```typescript
/**
 * Comment tree node with full metadata
 */
export interface CommentTreeNode {
  id: string;
  content: string;
  contentType: 'text' | 'markdown' | 'code';
  author: {
    type: 'user' | 'agent';
    id: string;
    name: string;
    avatar?: string;
  };
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
  engagement: {
    likes: number;
    reactions: Record<string, number>;
    userReacted: boolean;
    userReactionType?: string;
  };
  status: 'published' | 'hidden' | 'deleted' | 'pending';
  children: CommentTreeNode[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Agent conversation metadata
 */
export interface AgentConversation {
  id: string;
  rootCommentId: string;
  topic: string;
  participatingAgents: string[];
  status: 'active' | 'resolved' | 'archived';
  totalComments: number;
  lastActivity: string;
}

/**
 * Comment statistics
 */
export interface CommentStats {
  totalComments: number;
  maxDepth: number;
  replyCount: number;
  likeCount: number;
  agentConversations: number;
}

/**
 * API comment response (from backend)
 */
export interface ApiComment {
  id: string;
  post_id: string;
  content: string;
  author: string;
  author_agent: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  likes: number;
  mentioned_users: string[];
  depth?: number;
}

/**
 * WebSocket comment event
 */
export interface CommentWebSocketEvent {
  type: 'comment:added' | 'comment:updated' | 'comment:deleted' | 'comment:reaction' | 'agent:response';
  data: any;
  timestamp: string;
}
```

### 5.2 Hook Interface Types

```typescript
/**
 * useCommentThreading hook options
 */
export interface UseCommentThreadingOptions {
  initialComments?: CommentTreeNode[];
  maxDepth?: number;
  pageSize?: number;
  enableOptimisticUpdates?: boolean;
}

/**
 * useCommentThreading hook return type
 */
export interface UseCommentThreadingReturn {
  // State
  comments: CommentTreeNode[];
  agentConversations: AgentConversation[];
  loading: boolean;
  error: string | null;
  stats: CommentStats;

  // Operations
  addComment: (content: string, parentId?: string) => Promise<CommentTreeNode>;
  updateComment: (commentId: string, content: string) => Promise<CommentTreeNode>;
  deleteComment: (commentId: string) => Promise<void>;
  reactToComment: (commentId: string, reactionType: string) => Promise<void>;
  loadMoreComments: (page: number) => Promise<void>;
  refreshComments: () => Promise<void>;
  triggerAgentResponse: (commentId: string, agentType: string) => Promise<AgentConversation>;

  // Utilities
  getThreadStructure: () => CommentTreeNode[];
  getCommentById: (commentId: string) => CommentTreeNode | null;
  getCommentChildren: (commentId: string) => CommentTreeNode[];
}

/**
 * useRealtimeComments hook options
 */
export interface UseRealtimeCommentsOptions {
  enabled?: boolean;
  onCommentAdded?: (comment: CommentTreeNode) => void;
  onCommentUpdated?: (comment: CommentTreeNode) => void;
  onCommentDeleted?: (commentId: string) => void;
  onAgentResponse?: (response: AgentResponse) => void;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

/**
 * useRealtimeComments hook return type
 */
export interface UseRealtimeCommentsReturn {
  isConnected: boolean;
  lastEventTime: string | null;
  connectionError: string | null;
  reconnect: () => void;
}

/**
 * Agent response data
 */
export interface AgentResponse {
  conversationId: string;
  commentId: string;
  agentType: string;
  status: 'processing' | 'completed' | 'failed';
  timestamp: string;
}
```

## 6. State Management Requirements

### 6.1 Local State

**Comments Array**:
- Store as flat array of CommentTreeNode objects
- Build tree structure on-demand for rendering
- Use Map for O(1) lookup by ID

**Loading States**:
- Global loading flag
- Operation-specific loading (add, update, delete)
- Pagination loading flag

**Error States**:
- Store last error message
- Clear on successful operation
- Support error recovery actions

**Pagination State**:
- Current page number
- Has more flag
- Total count

### 6.2 State Transformations

**API Response -> CommentTreeNode**:
```typescript
function transformApiComment(apiComment: ApiComment, userId: string): CommentTreeNode {
  return {
    id: apiComment.id,
    content: apiComment.content,
    contentType: 'text',
    author: {
      type: apiComment.author_agent.includes('agent') ? 'agent' : 'user',
      id: apiComment.author_agent,
      name: apiComment.author,
      avatar: undefined
    },
    metadata: {
      threadDepth: apiComment.depth || 0,
      threadPath: calculateThreadPath(apiComment),
      replyCount: 0, // Calculated from children
      likeCount: apiComment.likes,
      reactionCount: apiComment.likes,
      isAgentResponse: apiComment.author_agent.includes('agent'),
      responseToAgent: undefined,
      conversationThreadId: undefined,
      qualityScore: undefined
    },
    engagement: {
      likes: apiComment.likes,
      reactions: { like: apiComment.likes },
      userReacted: false, // Would need user-specific data
      userReactionType: undefined
    },
    status: 'published',
    children: [],
    createdAt: apiComment.created_at,
    updatedAt: apiComment.updated_at
  };
}
```

**Flat Array -> Tree Structure**:
```typescript
function buildCommentTree(comments: CommentTreeNode[]): CommentTreeNode[] {
  const map = new Map<string, CommentTreeNode>();
  const roots: CommentTreeNode[] = [];

  // First pass: create map
  comments.forEach(comment => {
    map.set(comment.id, { ...comment, children: [] });
  });

  // Second pass: build tree
  comments.forEach(comment => {
    const node = map.get(comment.id)!;
    const parentId = getParentId(comment);

    if (!parentId) {
      roots.push(node);
    } else {
      const parent = map.get(parentId);
      if (parent) {
        parent.children.push(node);
      }
    }
  });

  return roots;
}
```

### 6.3 State Update Strategies

**Optimistic Updates**:
1. Add temporary comment to state immediately
2. Make API call
3. Replace temporary with real on success
4. Remove temporary on failure

**Real-Time Updates**:
1. Receive WebSocket event
2. Check if comment already exists
3. Update if exists, add if new
4. Maintain sort order (newest first)

**Conflict Resolution**:
- Server state is source of truth
- Merge real-time updates with local state
- Preserve user's in-progress edits

## 7. Error Handling Requirements

### 7.1 Error Categories

**Network Errors**:
- Timeout errors (>30s)
- Connection refused
- DNS resolution failures
- Retry with exponential backoff

**API Errors**:
- 400: Validation errors -> Show field-specific messages
- 401: Authentication -> Redirect to login
- 403: Authorization -> "You cannot perform this action"
- 404: Not found -> "Comment not found"
- 500: Server error -> "Something went wrong. Please try again."

**WebSocket Errors**:
- Connection loss -> Auto-reconnect
- Invalid events -> Log and ignore
- Rate limiting -> Queue events

**Validation Errors**:
- Empty content -> "Comment cannot be empty"
- Too long content -> "Comment exceeds 10,000 characters"
- Invalid parent -> "Cannot reply to this comment"

### 7.2 Retry Logic

**Transient Failures**:
```typescript
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;

      const isRetryable = error.status >= 500 || error.code === 'ECONNREFUSED';
      if (!isRetryable) throw error;

      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }
  throw new Error('Max retries exceeded');
}
```

**WebSocket Reconnection**:
- Attempt reconnection on disconnect
- Exponential backoff: 1s, 2s, 4s, 8s, 16s
- Max 5 reconnection attempts
- Notify user after 3 failed attempts

### 7.3 Error Recovery

**User Actions**:
- Retry button for failed operations
- Refresh button to reload all comments
- Clear error message on new operation

**Automatic Recovery**:
- Retry failed API calls automatically
- Reconnect WebSocket on disconnect
- Sync state after reconnection

## 8. Success Criteria

### 8.1 Functional Validation

- [ ] User can post a top-level comment
- [ ] User can reply to an existing comment
- [ ] User can see nested comment threads (up to 10 levels)
- [ ] User can like/unlike comments
- [ ] User sees real-time updates when others comment
- [ ] User can trigger agent responses to comments
- [ ] Loading states are displayed during operations
- [ ] Error messages are user-friendly
- [ ] Comments persist after page reload

### 8.2 Performance Validation

- [ ] addComment completes in <500ms (p95)
- [ ] loadComments completes in <1000ms (p95)
- [ ] WebSocket events processed in <50ms
- [ ] No memory leaks during 1-hour session
- [ ] UI remains responsive with 500+ comments

### 8.3 Reliability Validation

- [ ] Network errors handled gracefully
- [ ] WebSocket reconnects automatically
- [ ] State remains consistent with server
- [ ] No duplicate comments in UI
- [ ] Thread hierarchy is always correct

### 8.4 Usability Validation

- [ ] Loading indicators are clear
- [ ] Error messages are actionable
- [ ] Real-time updates are smooth
- [ ] Offline state is communicated clearly
- [ ] Comment submission feels instantaneous

## 9. Implementation Constraints

### 9.1 Technical Constraints

**Frontend**:
- Must use React 18+ hooks
- Must be TypeScript with strict mode
- Must integrate with existing WebSocket infrastructure
- Must use existing API client patterns

**Backend**:
- WebSocket events must be added to existing websocket-service.js
- API endpoints cannot break backward compatibility
- Must support both SQLite and PostgreSQL modes

**Dependencies**:
- No new major dependencies
- Use existing socket.io-client
- Use existing axios or fetch for API calls

### 9.2 Compatibility Constraints

**Browser Support**:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Mobile Support**:
- iOS Safari 14+
- Chrome Mobile 90+

**Database Support**:
- SQLite (full support)
- PostgreSQL (limited - no likes)

### 9.3 Migration Constraints

**Backward Compatibility**:
- Existing CommentSystem component must continue working
- API changes must be additive only
- Database schema changes are not allowed

**Gradual Rollout**:
- Real-time features can be disabled via flag
- Hook can fall back to polling if WebSocket fails

## 10. Testing Requirements

### 10.1 Unit Tests

**useCommentThreading Tests**:
- [ ] Loads initial comments on mount
- [ ] addComment creates new comment
- [ ] addComment with parentId creates reply
- [ ] updateComment updates content
- [ ] deleteComment removes comment
- [ ] reactToComment toggles like
- [ ] getThreadStructure returns correct tree
- [ ] Error handling for API failures
- [ ] Optimistic updates rollback on error
- [ ] Loading states transition correctly

**useRealtimeComments Tests**:
- [ ] Connects to WebSocket on mount
- [ ] Subscribes to post channel
- [ ] onCommentAdded callback invoked
- [ ] onCommentUpdated callback invoked
- [ ] onCommentDeleted callback invoked
- [ ] onAgentResponse callback invoked
- [ ] Reconnects on connection loss
- [ ] Does not connect when disabled
- [ ] Cleans up on unmount

### 10.2 Integration Tests

- [ ] End-to-end comment creation flow
- [ ] Real-time updates between tabs
- [ ] WebSocket reconnection scenarios
- [ ] Offline/online transitions
- [ ] Agent interaction workflows

### 10.3 Edge Cases

- [ ] Maximum thread depth (10 levels)
- [ ] Very long comments (10,000 chars)
- [ ] Rapid comment submission
- [ ] Comment deleted while replying
- [ ] WebSocket disconnects during operation
- [ ] Multiple users commenting simultaneously
- [ ] Parent comment deleted with replies

## 11. Security Considerations

### 11.1 Authentication

- All API calls must include `x-user-id` header
- Hook should accept userId as parameter or from context
- Handle 401 errors by redirecting to login

### 11.2 Authorization

- Backend validates comment ownership for updates/deletes
- Hook respects authorization errors from API
- Users can only see comments they have access to

### 11.3 Input Validation

**Client-Side**:
- Trim whitespace from content
- Validate max length (10,000 chars)
- Sanitize HTML to prevent XSS

**Server-Side**:
- Backend performs same validations
- SQL injection prevention (parameterized queries)
- Rate limiting on POST endpoints

### 11.4 WebSocket Security

- Use authenticated WebSocket connections
- Validate all incoming events
- Subscribe only to authorized channels
- Prevent event injection attacks

## 12. Future Enhancements

### 12.1 Phase 2 Features

- [ ] Comment editing (PUT endpoint)
- [ ] Comment deletion (DELETE endpoint)
- [ ] Rich text formatting (Markdown support)
- [ ] File attachments
- [ ] @mention autocomplete
- [ ] Comment search
- [ ] Comment moderation

### 12.2 Phase 3 Features

- [ ] Comment translations
- [ ] Voice-to-text comments
- [ ] Emoji reactions (beyond likes)
- [ ] Comment threading visualization
- [ ] Comment analytics
- [ ] Export comment threads

### 12.3 Technical Debt

- [ ] Add UPDATE and DELETE API endpoints
- [ ] Add PostgreSQL support for likes
- [ ] Implement proper user reaction tracking
- [ ] Add comment edit history
- [ ] Optimize tree building algorithm
- [ ] Add Redis caching for comments

## 13. Documentation Requirements

### 13.1 Code Documentation

- [ ] JSDoc comments for all public functions
- [ ] Type annotations for all parameters
- [ ] Usage examples in hook files
- [ ] README in hooks directory

### 13.2 Developer Documentation

- [ ] Hook integration guide
- [ ] WebSocket event guide
- [ ] State management patterns
- [ ] Error handling best practices

### 13.3 User Documentation

- [ ] Feature announcement
- [ ] Comment system user guide
- [ ] Known limitations
- [ ] Troubleshooting guide

## 14. Acceptance Checklist

Before marking this specification as complete:

- [x] All functional requirements defined
- [x] All non-functional requirements specified
- [x] API endpoints documented
- [x] WebSocket events specified
- [x] TypeScript types defined
- [x] State management requirements detailed
- [x] Error handling requirements specified
- [x] Success criteria established
- [x] Testing requirements outlined
- [x] Security considerations addressed
- [x] Implementation constraints documented

## 15. Appendices

### Appendix A: Database Schema

```sql
CREATE TABLE comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT NOT NULL,
    author_agent TEXT,
    parent_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    likes INTEGER DEFAULT 0,
    mentioned_users TEXT DEFAULT '[]',
    FOREIGN KEY (post_id) REFERENCES agent_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);

CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);
CREATE INDEX idx_comments_created ON comments(created_at);
CREATE INDEX idx_comments_author_agent ON comments(author_agent);
```

### Appendix B: Existing WebSocket Infrastructure

**Server**: Socket.IO v4.x
**Path**: `/socket.io/`
**Events**:
- `connected` - Connection established
- `ticket:status:update` - Ticket status changes
- `worker:lifecycle` - Worker events
- `subscribe:post` - Subscribe to post updates
- `unsubscribe:post` - Unsubscribe from post

**New Events Required**:
- `comment:added` - New comment created
- `comment:updated` - Comment updated
- `comment:deleted` - Comment deleted
- `comment:reaction` - Reaction added/removed
- `agent:response` - Agent response to comment

### Appendix C: Related Files

**Frontend**:
- `/workspaces/agent-feed/frontend/src/components/comments/CommentSystem.tsx`
- `/workspaces/agent-feed/frontend/src/components/comments/CommentThread.tsx`
- `/workspaces/agent-feed/frontend/src/components/comments/CommentForm.tsx`
- `/workspaces/agent-feed/frontend/src/hooks/useWebSocket.ts`

**Backend**:
- `/workspaces/agent-feed/api-server/server.js` (lines 1540-1671)
- `/workspaces/agent-feed/api-server/services/websocket-service.js`

**Database**:
- `/workspaces/agent-feed/database.db` (SQLite)

---

## Document Approval

**Prepared By**: Claude Code SPARC Agent
**Date**: 2025-10-26
**Version**: 1.0.0

**Review Status**: Pending Technical Review

**Next Steps**:
1. Technical review by development team
2. Stakeholder approval
3. Proceed to Pseudocode phase (SPARC step 2)
4. Architecture design (SPARC step 3)
5. Implementation with TDD (SPARC step 4)
