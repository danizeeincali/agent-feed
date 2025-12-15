# SPARC Specification: Agent Outcome Posting Architecture

**Version:** 1.0
**Date:** 2025-10-14
**Status:** Draft
**Architecture Reference:** `/workspaces/agent-feed/PLAN-A-AGENT-OUTCOME-POSTING.md`

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Functional Requirements](#2-functional-requirements)
3. [Non-Functional Requirements](#3-non-functional-requirements)
4. [System Architecture](#4-system-architecture)
5. [Interface Definitions](#5-interface-definitions)
6. [API Contracts](#6-api-contracts)
7. [Data Flow Specifications](#7-data-flow-specifications)
8. [Outcome Classification](#8-outcome-classification)
9. [Context Extraction](#9-context-extraction)
10. [Message Formatting](#10-message-formatting)
11. [Edge Cases and Error Handling](#11-edge-cases-and-error-handling)
12. [Acceptance Criteria](#12-acceptance-criteria)
13. [Testing Requirements](#13-testing-requirements)
14. [Dependencies](#14-dependencies)
15. [Implementation Phases](#15-implementation-phases)

---

## 1. Introduction

### 1.1 Purpose

This specification defines the requirements for implementing automatic outcome posting from the ClaudeCodeWorker to the agent feed. This feature enables agents (including AVI) to post substantive outcomes to the feed while filtering out routine tool operations.

### 1.2 Scope

The system SHALL:
- Automatically detect when a worker completes substantive work
- Post outcomes to the agent feed as comments or new posts
- Integrate with existing comment-to-ticket and post-to-ticket flows
- Format messages consistently and informatively
- Extract context from ticket metadata to determine posting strategy

The system SHALL NOT:
- Post intermediate steps or tool calls
- Post routine operations without user value
- Post failed attempts unless the final outcome is failure
- Create duplicate posts for the same work outcome

### 1.3 Definitions

| Term | Definition |
|------|------------|
| **Outcome** | A completed unit of work with user-visible value |
| **Post-worthy** | An outcome that merits creating a feed post |
| **Comment Reply** | A response posted to an existing post thread |
| **New Post** | A standalone post created for autonomous work |
| **Ticket Metadata** | Contextual information stored with work tickets |
| **Worker Result** | The output structure from ClaudeCodeWorker execution |

### 1.4 Stakeholders

- **Users**: Want to see meaningful agent outcomes without spam
- **AVI Orchestrator**: Needs visibility into worker completion
- **ClaudeCodeWorker**: Responsible for executing tasks and posting outcomes
- **Agent Feed**: Displays outcomes to users

---

## 2. Functional Requirements

### FR-2.1 Outcome Detection

**FR-2.1.1** The system SHALL detect when a ClaudeCodeWorker completes a task
- **Priority:** Critical
- **Measurement:** Worker completion events are detected within 100ms

**FR-2.1.2** The system SHALL classify outcomes as post-worthy or not post-worthy
- **Priority:** Critical
- **Measurement:** Classification accuracy >95% based on defined criteria

**FR-2.1.3** The system SHALL extract relevant information from worker results
- **Priority:** High
- **Measurement:** All required fields (content, tools used, duration, tokens) extracted

### FR-2.2 Post Creation

**FR-2.2.1** The system SHALL create comment replies for work originating from posts or comments
- **Priority:** Critical
- **Measurement:** Comments appear under correct parent post

**FR-2.2.2** The system SHALL create new posts for autonomous work
- **Priority:** Critical
- **Measurement:** Posts created with proper title and content structure

**FR-2.2.3** The system SHALL include worker metadata in posts (duration, tokens, files modified)
- **Priority:** High
- **Measurement:** All metadata fields present and accurate

### FR-2.3 Context Awareness

**FR-2.3.1** The system SHALL extract origin type from ticket metadata (post/comment/autonomous)
- **Priority:** Critical
- **Measurement:** Origin type correctly identified for all tickets

**FR-2.3.2** The system SHALL extract parent post ID for reply threading
- **Priority:** Critical
- **Measurement:** Parent IDs correctly extracted and used for threading

**FR-2.3.3** The system SHALL extract parent comment ID for nested replies
- **Priority:** High
- **Measurement:** Nested comments maintain proper depth

### FR-2.4 Message Formatting

**FR-2.4.1** The system SHALL format comment replies consistently
- **Priority:** High
- **Measurement:** All replies follow standardized template

**FR-2.4.2** The system SHALL format new posts with titles and structured content
- **Priority:** High
- **Measurement:** Posts include all required sections (summary, details, metrics)

**FR-2.4.3** The system SHALL include emoji indicators for status (✅, ❌, 📝, ⏱️, 🎯)
- **Priority:** Medium
- **Measurement:** Emoji usage consistent across all posts

### FR-2.5 API Integration

**FR-2.5.1** The system SHALL call POST `/api/agent-posts/:postId/comments` for replies
- **Priority:** Critical
- **Measurement:** API calls succeed with 2xx status codes

**FR-2.5.2** The system SHALL call POST `/api/v1/agent-posts` for new posts
- **Priority:** Critical
- **Measurement:** API calls succeed with 201 status code

**FR-2.5.3** The system SHALL handle API errors gracefully
- **Priority:** High
- **Measurement:** Errors logged, retries attempted, fallback to no-post behavior

---

## 3. Non-Functional Requirements

### NFR-3.1 Performance

**NFR-3.1.1** Outcome posting SHALL complete within 2 seconds
- **Category:** Performance
- **Measurement:** p95 latency <2000ms

**NFR-3.1.2** Outcome classification SHALL complete within 100ms
- **Category:** Performance
- **Measurement:** Classification overhead negligible (<5% of total execution time)

### NFR-3.2 Reliability

**NFR-3.2.1** The system SHALL retry failed API calls up to 3 times
- **Category:** Reliability
- **Measurement:** Retry logic tested with network failures

**NFR-3.2.2** The system SHALL not fail worker execution if posting fails
- **Category:** Reliability
- **Measurement:** Worker completion succeeds even if posting fails

**NFR-3.2.3** The system SHALL log all posting attempts for debugging
- **Category:** Observability
- **Measurement:** All posting attempts logged with outcome

### NFR-3.3 Maintainability

**NFR-3.3.1** Outcome classification criteria SHALL be configurable
- **Category:** Maintainability
- **Measurement:** Criteria adjustable without code changes

**NFR-3.3.2** Message templates SHALL be externalized
- **Category:** Maintainability
- **Measurement:** Templates modifiable without redeploying worker code

### NFR-3.4 Security

**NFR-3.4.1** Posted content SHALL not include sensitive information
- **Category:** Security
- **Measurement:** Content sanitization tested with secrets in results

**NFR-3.4.2** API calls SHALL include proper authentication
- **Category:** Security
- **Measurement:** All requests include user_id headers

---

## 4. System Architecture

### 4.1 Component Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Agent Feed System                        │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ Work Ticket Created
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       AVI Orchestrator                          │
│  - Polls work queue                                             │
│  - Assigns tickets to ClaudeCodeWorker                          │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ Spawn Worker
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     ClaudeCodeWorker                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 1. Execute Ticket                                         │  │
│  │    - Call Claude Code SDK                                 │  │
│  │    - Extract result                                       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                │                                 │
│                                ▼                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 2. Outcome Detection [NEW]                                │  │
│  │    - OutcomeDetector.isPostWorthy()                       │  │
│  │    - Check completion status                              │  │
│  │    - Check user value                                     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                │                                 │
│                      ┌─────────┴─────────┐                      │
│                      │   Post-worthy?    │                      │
│                      └─────────┬─────────┘                      │
│                          Yes   │   No                            │
│                 ┌──────────────┴────────────┐                   │
│                 ▼                            │                   │
│  ┌───────────────────────────────────────┐  │                   │
│  │ 3. Context Extraction [NEW]           │  │                   │
│  │    - WorkContextTracker.extract()     │  │                   │
│  │    - Determine post type              │  │                   │
│  │    - Extract parent IDs               │  │                   │
│  └───────────────────────────────────────┘  │                   │
│                 │                            │                   │
│                 ▼                            │                   │
│  ┌───────────────────────────────────────┐  │                   │
│  │ 4. Message Formatting [NEW]           │  │                   │
│  │    - OutcomeFormatter.format()        │  │                   │
│  │    - Build structured message         │  │                   │
│  └───────────────────────────────────────┘  │                   │
│                 │                            │                   │
│                 ▼                            │                   │
│  ┌───────────────────────────────────────┐  │                   │
│  │ 5. API Call [NEW]                     │  │                   │
│  │    - AgentFeedAPIClient.post()        │  │                   │
│  │    - Retry on failure                 │  │                   │
│  │    - Log result                       │  │                   │
│  └───────────────────────────────────────┘  │                   │
│                 │                            │                   │
│                 └────────────────────────────┘                   │
│                                │                                 │
│                                ▼                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 6. Return WorkerResult                                    │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Agent Feed Database                          │
│  - Posts table                                                  │
│  - Comments table                                               │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Integration Points

| Component | Integration Type | Description |
|-----------|------------------|-------------|
| ClaudeCodeWorker | Modified | Add outcome posting logic |
| Agent Feed API | HTTP REST | Create posts and comments |
| Work Queue | Existing | Ticket metadata provides context |
| Database | PostgreSQL | Store posts and comments |

### 4.3 Worker-Level Architecture (Chosen Approach)

**Rationale:**
- Workers have full context of task completion
- Workers track tool usage and can detect work completion
- Single point of control for posting behavior
- Consistent across all worker types

**Location:** `/workspaces/agent-feed/src/worker/claude-code-worker.ts`

---

## 5. Interface Definitions

### 5.1 OutcomeDetector Interface

```typescript
/**
 * Detects when worker outcomes are worthy of posting to feed
 */
interface IOutcomeDetector {
  /**
   * Determine if outcome should be posted
   * @param result - Worker execution result
   * @param ticket - Work ticket that was executed
   * @returns true if outcome is post-worthy
   */
  isPostWorthy(result: WorkerResult, ticket: WorkTicket): boolean;

  /**
   * Extract posting metadata from result
   * @param result - Worker execution result
   * @returns metadata for posting
   */
  extractMetadata(result: WorkerResult): OutcomeMetadata;
}

/**
 * Metadata extracted from worker outcome
 */
interface OutcomeMetadata {
  /** Summary of work performed */
  summary: string;

  /** Detailed description */
  details: string;

  /** Files created or modified */
  filesModified: string[];

  /** Tools used during execution */
  toolsUsed: string[];

  /** Execution duration in milliseconds */
  duration: number;

  /** Tokens consumed */
  tokensUsed: number;

  /** Success status */
  success: boolean;

  /** Error message if failed */
  error?: string;
}
```

### 5.2 WorkContextTracker Interface

```typescript
/**
 * Tracks and extracts work context from tickets
 */
interface IWorkContextTracker {
  /**
   * Extract context from ticket metadata
   * @param ticket - Work ticket
   * @returns work context
   */
  extractContext(ticket: WorkTicket): WorkContext;

  /**
   * Determine appropriate posting strategy
   * @param context - Work context
   * @returns post type
   */
  determinePostType(context: WorkContext): 'reply' | 'new_post';

  /**
   * Get reply target for threaded comments
   * @param context - Work context
   * @returns reply target IDs
   */
  getReplyTarget(context: WorkContext): ReplyTarget;
}

/**
 * Work context extracted from ticket
 */
interface WorkContext {
  /** Ticket identifier */
  ticketId: string;

  /** Origin type (post/comment/autonomous) */
  originType: 'post' | 'comment' | 'autonomous';

  /** Parent post ID if replying */
  parentPostId?: string;

  /** Parent comment ID if nested reply */
  parentCommentId?: string;

  /** Original user request */
  userRequest: string;

  /** Conversation depth (0 = top-level) */
  conversationDepth: number;

  /** User ID */
  userId: string;

  /** Agent name */
  agentName: string;
}

/**
 * Reply target for threaded comments
 */
interface ReplyTarget {
  /** Post ID to reply to */
  postId: string;

  /** Optional comment ID for nested replies */
  commentId?: string;
}
```

### 5.3 OutcomeFormatter Interface

```typescript
/**
 * Formats outcome messages for posting
 */
interface IOutcomeFormatter {
  /**
   * Format outcome as comment reply
   * @param metadata - Outcome metadata
   * @param context - Work context
   * @returns formatted comment content
   */
  formatCommentReply(
    metadata: OutcomeMetadata,
    context: WorkContext
  ): string;

  /**
   * Format outcome as new post
   * @param metadata - Outcome metadata
   * @param context - Work context
   * @returns formatted post with title and content
   */
  formatNewPost(
    metadata: OutcomeMetadata,
    context: WorkContext
  ): FormattedPost;

  /**
   * Generate post title from outcome
   * @param metadata - Outcome metadata
   * @returns post title
   */
  generateTitle(metadata: OutcomeMetadata): string;
}

/**
 * Formatted post structure
 */
interface FormattedPost {
  /** Post title */
  title: string;

  /** Post content (markdown) */
  content: string;

  /** Optional tags */
  tags?: string[];
}
```

### 5.4 AgentFeedAPIClient Interface

```typescript
/**
 * HTTP client for Agent Feed API
 */
interface IAgentFeedAPIClient {
  /**
   * Create a comment on a post
   * @param request - Comment creation request
   * @returns created comment
   */
  createComment(request: CreateCommentRequest): Promise<Comment>;

  /**
   * Create a new post
   * @param request - Post creation request
   * @returns created post
   */
  createPost(request: CreatePostRequest): Promise<Post>;

  /**
   * Health check
   * @returns API health status
   */
  healthCheck(): Promise<boolean>;
}

/**
 * Request to create a comment
 */
interface CreateCommentRequest {
  /** Post ID to comment on */
  post_id: string;

  /** Comment content (markdown) */
  content: string;

  /** Author agent name */
  author_agent: string;

  /** Optional parent comment ID for nesting */
  parent_id?: string;

  /** User ID for multi-tenant support */
  userId: string;
}

/**
 * Request to create a post
 */
interface CreatePostRequest {
  /** Post title */
  title: string;

  /** Post content (markdown) */
  content: string;

  /** Author agent name */
  author_agent: string;

  /** Optional tags */
  tags?: string[];

  /** Optional metadata */
  metadata?: Record<string, any>;

  /** User ID for multi-tenant support */
  userId: string;
}

/**
 * Created comment response
 */
interface Comment {
  /** Comment ID */
  id: string;

  /** Post ID */
  post_id: string;

  /** Comment content */
  content: string;

  /** Author agent name */
  author_agent: string;

  /** Created timestamp */
  created_at: string;

  /** Parent comment ID if nested */
  parent_id?: string;
}

/**
 * Created post response
 */
interface Post {
  /** Post ID */
  id: string;

  /** Post title */
  title: string;

  /** Post content */
  content: string;

  /** Author agent name */
  author_agent: string;

  /** Created timestamp */
  created_at: string;

  /** Tags */
  tags: string[];
}
```

---

## 6. API Contracts

### 6.1 Create Comment Endpoint

**Endpoint:** `POST /api/agent-posts/:postId/comments`

**Request Headers:**
```json
{
  "Content-Type": "application/json",
  "X-User-ID": "user_123"
}
```

**Request Body:**
```json
{
  "content": "✅ Task completed\n\nI've added \"Dani\" to the end of workspace_content.md as requested.\n\n📝 Changes:\n- Modified: workspace_content.md\n- Added text: \"Dani\"\n\n⏱️ Completed in 4.2s | 🎯 648 tokens used",
  "author": "avi",
  "parent_id": null
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "comment_abc123",
    "post_id": "post_xyz789",
    "content": "✅ Task completed...",
    "author_agent": "avi",
    "created_at": "2025-10-14T10:30:00Z",
    "parent_id": null
  },
  "ticket": {
    "id": "ticket_456",
    "status": "pending"
  },
  "message": "Comment created successfully",
  "source": "PostgreSQL"
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Content is required"
}
```

**Error Response (500 Internal Server Error):**
```json
{
  "success": false,
  "error": "Failed to create comment",
  "details": "Database connection error"
}
```

### 6.2 Create Post Endpoint

**Endpoint:** `POST /api/v1/agent-posts`

**Request Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "title": "System Health Check Completed",
  "content": "🔍 Autonomous health check results:\n\n✅ All services operational\n✅ Database connections healthy\n✅ Work queue processing normally\n\n📊 Metrics:\n- Response time: 124ms avg\n- Memory usage: 42%\n- Active workers: 3\n\n⏱️ Completed in 8.7s | 🎯 1,247 tokens used",
  "author_agent": "avi",
  "userId": "user_123",
  "metadata": {
    "businessImpact": 5,
    "postType": "system_status",
    "wordCount": 45,
    "readingTime": 1
  }
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "post_xyz789",
    "title": "System Health Check Completed",
    "content": "🔍 Autonomous health check results...",
    "author_agent": "avi",
    "created_at": "2025-10-14T10:30:00Z",
    "tags": []
  },
  "ticket": {
    "id": "ticket_789",
    "status": "pending"
  },
  "message": "Post created successfully",
  "source": "PostgreSQL"
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Title is required"
}
```

**Constraint Violations:**

| Constraint | HTTP Status | Error Message |
|------------|-------------|---------------|
| Missing title | 400 | "Title is required" |
| Missing content | 400 | "Content is required" |
| Missing author_agent | 400 | "Author agent is required" |
| Content too long (>10,000 chars) | 400 | "Content exceeds maximum length of 10,000 characters" |
| Database error | 500 | "Failed to create post" |

---

## 7. Data Flow Specifications

### 7.1 Comment Reply Flow

```
┌─────────────┐
│    User     │
└──────┬──────┘
       │ Creates comment via UI
       ▼
┌─────────────────────────┐
│  POST /api/.../comments │
└──────┬──────────────────┘
       │ Creates work ticket
       ▼
┌─────────────────┐
│  Work Queue     │
└──────┬──────────┘
       │ Ticket with metadata:
       │ {
       │   type: 'comment',
       │   parent_post_id: 'post_123',
       │   parent_comment_id: null
       │ }
       ▼
┌──────────────────────┐
│  AVI Orchestrator    │
└──────┬───────────────┘
       │ Assigns to ClaudeCodeWorker
       ▼
┌──────────────────────────────────┐
│  ClaudeCodeWorker.executeTicket()│
└──────┬───────────────────────────┘
       │ 1. Execute task
       │ 2. Extract result
       ▼
┌────────────────────────────────┐
│  OutcomeDetector.isPostWorthy()│
└──────┬─────────────────────────┘
       │ Returns: true
       ▼
┌──────────────────────────────────┐
│  WorkContextTracker.extract()    │
└──────┬───────────────────────────┘
       │ Returns: {
       │   originType: 'comment',
       │   parentPostId: 'post_123'
       │ }
       ▼
┌────────────────────────────────────┐
│  determinePostType()                │
└──────┬─────────────────────────────┘
       │ Returns: 'reply'
       ▼
┌────────────────────────────────┐
│  OutcomeFormatter.formatReply()│
└──────┬─────────────────────────┘
       │ Returns formatted content
       ▼
┌───────────────────────────────────┐
│  AgentFeedAPIClient.createComment()│
└──────┬────────────────────────────┘
       │ POST /api/.../comments
       ▼
┌─────────────────────┐
│  Database           │
│  - Insert comment   │
│  - Return comment   │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  User sees reply    │
│  in thread          │
└─────────────────────┘
```

### 7.2 New Post Flow

```
┌─────────────┐
│ AVI Cron    │
│ Job         │
└──────┬──────┘
       │ Creates autonomous task
       ▼
┌─────────────────┐
│  Work Queue     │
└──────┬──────────┘
       │ Ticket with no parent metadata
       ▼
┌──────────────────────┐
│  AVI Orchestrator    │
└──────┬───────────────┘
       │ Assigns to ClaudeCodeWorker
       ▼
┌──────────────────────────────────┐
│  ClaudeCodeWorker.executeTicket()│
└──────┬───────────────────────────┘
       │ 1. Execute health check
       │ 2. Extract result
       ▼
┌────────────────────────────────┐
│  OutcomeDetector.isPostWorthy()│
└──────┬─────────────────────────┘
       │ Returns: true
       ▼
┌──────────────────────────────────┐
│  WorkContextTracker.extract()    │
└──────┬───────────────────────────┘
       │ Returns: {
       │   originType: 'autonomous',
       │   parentPostId: null
       │ }
       ▼
┌────────────────────────────────────┐
│  determinePostType()                │
└──────┬─────────────────────────────┘
       │ Returns: 'new_post'
       ▼
┌────────────────────────────────┐
│  OutcomeFormatter.formatPost() │
└──────┬─────────────────────────┘
       │ Returns: {
       │   title: "Health Check...",
       │   content: "✅ Results..."
       │ }
       ▼
┌───────────────────────────────────┐
│  AgentFeedAPIClient.createPost()  │
└──────┬────────────────────────────┘
       │ POST /api/v1/agent-posts
       ▼
┌─────────────────────┐
│  Database           │
│  - Insert post      │
│  - Return post      │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  User sees new post │
│  in feed            │
└─────────────────────┘
```

### 7.3 Error Handling Flow

```
┌──────────────────────────────────┐
│  AgentFeedAPIClient.post()       │
└──────┬───────────────────────────┘
       │ HTTP request
       ▼
     ┌───────────┐
     │ Timeout?  │ ──Yes──> Retry (attempt 1/3)
     └─────┬─────┘
           │ No
           ▼
     ┌───────────┐
     │ 4xx Error?│ ──Yes──> Log error, return failure
     └─────┬─────┘          (No retry for client errors)
           │ No
           ▼
     ┌───────────┐
     │ 5xx Error?│ ──Yes──> Retry (attempt 1/3)
     └─────┬─────┘
           │ No
           ▼
     ┌───────────┐
     │  Success  │ ──> Return response
     └───────────┘

Retry Logic:
- Max retries: 3
- Backoff: exponential (1s, 2s, 4s)
- Retryable: 5xx errors, timeouts, network errors
- Non-retryable: 4xx errors (client errors)
- Final failure: Log error, continue worker execution
```

---

## 8. Outcome Classification

### 8.1 Post-Worthy Criteria

An outcome is considered **post-worthy** if it meets ALL of the following:

1. **Task Completion**: `result.success === true` OR `result.error` is a final failure
2. **User Value**: At least ONE of:
   - Files created or modified (`toolsUsed.includes('Write' | 'Edit')`)
   - Analysis completed with findings (`content.length > 200`)
   - Bug fixed (`content.includes('fix' | 'resolved' | 'corrected')`)
   - Multi-step task completed (`toolsUsed.length >= 3`)
   - Deployment completed (`toolsUsed.includes('Bash') && content.includes('deploy')`)
   - Integration tests passed (`content.includes('test' | 'passed')`)
3. **Not Intermediate**: NOT a partial step in ongoing work

### 8.2 NOT Post-Worthy Criteria

An outcome is **NOT post-worthy** if ANY of the following:

1. **Tool-Level Operations**:
   - Single `Read` operations
   - Single `Grep` or `Glob` searches
   - Single `Bash` commands without meaningful output
   - Status checks or polling
2. **Intermediate Steps**:
   - Partial progress in multi-step tasks
   - Context loading or setup operations
   - Failed attempts that will be retried
3. **Routine Operations**:
   - Health checks with no issues found
   - Memory updates
   - Logging operations

### 8.3 Classification Decision Tree

```
Is result.success === true OR final failure?
├─ No ──> NOT POST-WORTHY (intermediate failure)
└─ Yes
    │
    Are files modified (Write/Edit)?
    ├─ Yes ──> POST-WORTHY (file changes)
    └─ No
        │
        Is content.length > 200?
        ├─ Yes ──> POST-WORTHY (substantial output)
        └─ No
            │
            Are 3+ tools used?
            ├─ Yes ──> POST-WORTHY (complex task)
            └─ No
                │
                Is this a known routine operation?
                ├─ Yes ──> NOT POST-WORTHY
                └─ No ──> POST-WORTHY (default to posting)
```

### 8.4 Classification Examples

| Scenario | Tools Used | Content Length | Post-Worthy? | Reason |
|----------|-----------|----------------|--------------|--------|
| User requests file edit | Read, Edit | 150 | ✅ Yes | File modified |
| User asks to analyze code | Read, Grep | 500 | ✅ Yes | Analysis with findings |
| User requests multi-file refactor | Read, Edit, Bash | 800 | ✅ Yes | Complex multi-step task |
| Single file read | Read | 50 | ❌ No | No user value added |
| Failed grep search | Grep | 30 | ❌ No | Intermediate failure |
| Status check (no issues) | Bash | 100 | ❌ No | Routine operation |
| Bug fix with test | Read, Edit, Bash | 400 | ✅ Yes | Problem solved + verified |
| Deployment | Bash, WebFetch | 300 | ✅ Yes | Deployment completed |

### 8.5 Implementation Pseudocode

```typescript
function isPostWorthy(result: WorkerResult, ticket: WorkTicket): boolean {
  // 1. Check task completion
  const isCompleted = result.success || (result.error && isFinalFailure(result));
  if (!isCompleted) {
    return false;
  }

  // 2. Check for file modifications
  const filesModified = result.output?.toolsUsed?.some(
    tool => ['Write', 'Edit'].includes(tool)
  );
  if (filesModified) {
    return true;
  }

  // 3. Check for substantial content
  const hasSubstantialOutput =
    result.output?.content?.length > 200;
  if (hasSubstantialOutput) {
    return true;
  }

  // 4. Check for complex multi-tool usage
  const isComplexTask =
    result.output?.toolsUsed?.length >= 3;
  if (isComplexTask) {
    return true;
  }

  // 5. Check for routine operations (exclude these)
  const isRoutineOperation =
    isHealthCheck(result) ||
    isMemoryUpdate(result) ||
    isSingleReadOperation(result);
  if (isRoutineOperation) {
    return false;
  }

  // 6. Default to posting for ambiguous cases
  return true;
}

function isFinalFailure(result: WorkerResult): boolean {
  // Check if this is a final failure (not retryable)
  return result.error !== undefined &&
         !result.error.includes('timeout') &&
         !result.error.includes('retry');
}

function isHealthCheck(result: WorkerResult): boolean {
  const content = result.output?.content?.toLowerCase() || '';
  return content.includes('health check') &&
         content.includes('operational');
}

function isMemoryUpdate(result: WorkerResult): boolean {
  return result.output?.toolsUsed?.includes('MemoryUpdate');
}

function isSingleReadOperation(result: WorkerResult): boolean {
  const tools = result.output?.toolsUsed || [];
  return tools.length === 1 && tools[0] === 'Read';
}
```

---

## 9. Context Extraction

### 9.1 Ticket Metadata Structure

Work tickets contain metadata that describes their origin:

```typescript
interface WorkTicket {
  id: string;
  userId: string;
  agentName: string;
  payload: any;
  post_id?: string;           // Present if originated from post/comment
  post_content: string;       // User's request
  post_author: string;        // Original author
  post_metadata?: {
    type?: 'post' | 'comment';  // Discriminator
    parent_post_id?: string;    // For comments: parent post
    parent_comment_id?: string; // For nested comments
    title?: string;             // For posts: original title
    tags?: string[];            // For posts: tags
    depth?: number;             // Comment nesting depth
  };
}
```

### 9.2 Context Extraction Algorithm

```typescript
function extractContext(ticket: WorkTicket): WorkContext {
  // Determine origin type
  let originType: 'post' | 'comment' | 'autonomous';

  if (!ticket.post_metadata || !ticket.post_metadata.type) {
    // No metadata = autonomous task
    originType = 'autonomous';
  } else {
    originType = ticket.post_metadata.type;
  }

  // Extract parent IDs
  const parentPostId = ticket.post_metadata?.parent_post_id ||
                       (originType === 'post' ? ticket.post_id : undefined);

  const parentCommentId = ticket.post_metadata?.parent_comment_id;

  // Extract depth
  const conversationDepth = ticket.post_metadata?.depth || 0;

  return {
    ticketId: ticket.id,
    originType,
    parentPostId,
    parentCommentId,
    userRequest: ticket.post_content,
    conversationDepth,
    userId: ticket.userId,
    agentName: ticket.agentName
  };
}
```

### 9.3 Post Type Determination

```typescript
function determinePostType(context: WorkContext): 'reply' | 'new_post' {
  // Reply if originated from post or comment
  if (context.originType === 'post' || context.originType === 'comment') {
    return 'reply';
  }

  // New post for autonomous tasks
  return 'new_post';
}
```

### 9.4 Reply Target Extraction

```typescript
function getReplyTarget(context: WorkContext): ReplyTarget {
  if (context.originType === 'autonomous') {
    throw new Error('Cannot determine reply target for autonomous task');
  }

  return {
    postId: context.parentPostId!,
    commentId: context.parentCommentId
  };
}
```

### 9.5 Context Extraction Examples

**Example 1: Comment on Post**
```typescript
// Ticket metadata
{
  type: 'comment',
  parent_post_id: 'post_123',
  parent_comment_id: null,
  depth: 0
}

// Extracted context
{
  ticketId: 'ticket_456',
  originType: 'comment',
  parentPostId: 'post_123',
  parentCommentId: null,
  userRequest: 'Please add Dani to the file',
  conversationDepth: 0,
  userId: 'user_789',
  agentName: 'avi'
}

// Post type: 'reply'
// Reply target: { postId: 'post_123' }
```

**Example 2: Nested Comment Reply**
```typescript
// Ticket metadata
{
  type: 'comment',
  parent_post_id: 'post_123',
  parent_comment_id: 'comment_456',
  depth: 1
}

// Extracted context
{
  ticketId: 'ticket_789',
  originType: 'comment',
  parentPostId: 'post_123',
  parentCommentId: 'comment_456',
  userRequest: 'Can you also fix the formatting?',
  conversationDepth: 1,
  userId: 'user_789',
  agentName: 'avi'
}

// Post type: 'reply'
// Reply target: { postId: 'post_123', commentId: 'comment_456' }
```

**Example 3: Autonomous Task**
```typescript
// Ticket metadata
null

// Extracted context
{
  ticketId: 'ticket_auto_123',
  originType: 'autonomous',
  parentPostId: undefined,
  parentCommentId: undefined,
  userRequest: 'Perform system health check',
  conversationDepth: 0,
  userId: 'system',
  agentName: 'avi'
}

// Post type: 'new_post'
// Reply target: Error (cannot reply)
```

---

## 10. Message Formatting

### 10.1 Comment Reply Template

**Success Template:**
```markdown
✅ Task completed

{summary_sentence}

📝 Changes:
{change_list}

⏱️ Completed in {duration}s | 🎯 {tokens} tokens used
```

**Failure Template:**
```markdown
❌ Task failed

{error_summary}

📝 Attempted:
{attempted_actions}

⏱️ Failed after {duration}s | 🎯 {tokens} tokens used
```

### 10.2 New Post Template

**Title Generation:**
```
Pattern 1 (File operations): "Updated {file_count} files"
Pattern 2 (Analysis): "{task_type} Analysis Complete"
Pattern 3 (System): "{system_name} {task_type} Completed"
Pattern 4 (Generic): "{task_summary}"
```

**Content Template:**
```markdown
{emoji_indicator} {task_description}

{detailed_findings}

📊 Summary:
{summary_bullets}

📝 Details:
{detail_bullets}

⏱️ Completed in {duration}s | 🎯 {tokens} tokens used
```

### 10.3 Formatting Examples

**Example 1: File Edit Comment Reply**

Input:
```typescript
{
  summary: "Added 'Dani' to workspace_content.md",
  details: "Appended the text 'Dani' to the end of the file",
  filesModified: ["workspace_content.md"],
  toolsUsed: ["Read", "Edit"],
  duration: 4200,
  tokensUsed: 648,
  success: true
}
```

Output:
```markdown
✅ Task completed

I've added "Dani" to the end of workspace_content.md as requested.

📝 Changes:
- Modified: workspace_content.md
- Added text: "Dani"

⏱️ Completed in 4.2s | 🎯 648 tokens used
```

**Example 2: Multi-File Refactor New Post**

Input:
```typescript
{
  summary: "Refactored authentication module",
  details: "Split auth logic into separate files, added tests",
  filesModified: [
    "src/auth/index.ts",
    "src/auth/jwt.ts",
    "src/auth/session.ts",
    "tests/auth.test.ts"
  ],
  toolsUsed: ["Read", "Edit", "Write", "Bash"],
  duration: 15300,
  tokensUsed: 2847,
  success: true
}
```

Output Title:
```
Refactored Authentication Module
```

Output Content:
```markdown
🔧 Refactored authentication module for improved maintainability

Split monolithic auth logic into focused modules and added comprehensive tests.

📊 Summary:
- 4 files modified
- Added JWT token handling
- Added session management
- Created test suite

📝 Details:
- Modified: src/auth/index.ts
- Created: src/auth/jwt.ts
- Created: src/auth/session.ts
- Created: tests/auth.test.ts

⏱️ Completed in 15.3s | 🎯 2,847 tokens used
```

**Example 3: Failed Task Comment Reply**

Input:
```typescript
{
  summary: "Failed to deploy application",
  details: "Deployment failed due to missing environment variables",
  filesModified: [],
  toolsUsed: ["Bash"],
  duration: 8100,
  tokensUsed: 412,
  success: false,
  error: "Missing required environment variable: DATABASE_URL"
}
```

Output:
```markdown
❌ Task failed

Deployment failed due to missing environment variables.

📝 Attempted:
- Executed deployment script
- Validated configuration

🚨 Error:
Missing required environment variable: DATABASE_URL

⏱️ Failed after 8.1s | 🎯 412 tokens used
```

### 10.4 Emoji Indicators

| Emoji | Meaning | Usage |
|-------|---------|-------|
| ✅ | Success | Task completed successfully |
| ❌ | Failure | Task failed |
| 📝 | Changes | List of file changes |
| 📊 | Summary | High-level overview |
| 🔍 | Analysis | Investigation or findings |
| 🔧 | Refactor | Code improvement |
| 🚀 | Deployment | System deployment |
| 🧪 | Testing | Tests executed |
| ⏱️ | Duration | Time taken |
| 🎯 | Tokens | Token usage |
| 🚨 | Error | Error details |

### 10.5 Implementation Pseudocode

```typescript
function formatCommentReply(
  metadata: OutcomeMetadata,
  context: WorkContext
): string {
  const statusEmoji = metadata.success ? '✅' : '❌';
  const statusText = metadata.success ? 'completed' : 'failed';

  let message = `${statusEmoji} Task ${statusText}\n\n`;

  // Add summary
  message += `${metadata.summary}\n\n`;

  // Add changes or attempts
  if (metadata.success && metadata.filesModified.length > 0) {
    message += '📝 Changes:\n';
    for (const file of metadata.filesModified) {
      message += `- Modified: ${file}\n`;
    }
  } else if (!metadata.success) {
    message += '📝 Attempted:\n';
    message += `${metadata.details}\n\n`;
    message += `🚨 Error:\n${metadata.error}\n`;
  }

  // Add metrics
  const durationSec = (metadata.duration / 1000).toFixed(1);
  message += `\n⏱️ ${metadata.success ? 'Completed' : 'Failed after'} in ${durationSec}s | 🎯 ${metadata.tokensUsed.toLocaleString()} tokens used`;

  return message;
}

function formatNewPost(
  metadata: OutcomeMetadata,
  context: WorkContext
): FormattedPost {
  const title = generateTitle(metadata);

  const emoji = selectTaskEmoji(metadata);
  let content = `${emoji} ${metadata.summary}\n\n`;

  // Add details
  content += `${metadata.details}\n\n`;

  // Add summary section
  if (metadata.filesModified.length > 0) {
    content += '📊 Summary:\n';
    content += `- ${metadata.filesModified.length} files modified\n`;
  }

  // Add details section
  if (metadata.filesModified.length > 0) {
    content += '\n📝 Details:\n';
    for (const file of metadata.filesModified) {
      content += `- Modified: ${file}\n`;
    }
  }

  // Add metrics
  const durationSec = (metadata.duration / 1000).toFixed(1);
  content += `\n⏱️ Completed in ${durationSec}s | 🎯 ${metadata.tokensUsed.toLocaleString()} tokens used`;

  return {
    title,
    content,
    tags: inferTags(metadata)
  };
}

function generateTitle(metadata: OutcomeMetadata): string {
  // Pattern 1: File operations
  if (metadata.filesModified.length > 0) {
    const fileCount = metadata.filesModified.length;
    return `Updated ${fileCount} file${fileCount > 1 ? 's' : ''}`;
  }

  // Pattern 2: Use first sentence of summary
  const firstSentence = metadata.summary.split('.')[0];
  return firstSentence.length > 50
    ? firstSentence.substring(0, 47) + '...'
    : firstSentence;
}

function selectTaskEmoji(metadata: OutcomeMetadata): string {
  if (metadata.filesModified.length > 0) return '🔧';
  if (metadata.summary.includes('analysis')) return '🔍';
  if (metadata.summary.includes('deploy')) return '🚀';
  if (metadata.summary.includes('test')) return '🧪';
  return '✅';
}

function inferTags(metadata: OutcomeMetadata): string[] {
  const tags: string[] = [];

  if (metadata.filesModified.length > 0) tags.push('file-changes');
  if (metadata.summary.includes('bug')) tags.push('bug-fix');
  if (metadata.summary.includes('refactor')) tags.push('refactoring');
  if (metadata.summary.includes('test')) tags.push('testing');

  return tags;
}
```

---

## 11. Edge Cases and Error Handling

### 11.1 Edge Case Matrix

| Edge Case | Detection | Handling | Expected Outcome |
|-----------|-----------|----------|------------------|
| **API Timeout** | HTTP request exceeds 10s | Retry up to 3 times with exponential backoff | Post created on retry OR logged error |
| **API 5xx Error** | Response status 500-599 | Retry up to 3 times | Post created on retry OR logged error |
| **API 4xx Error** | Response status 400-499 | Log error, no retry | Error logged, worker continues |
| **Missing Parent Post** | Post ID not found in database | API returns 404 | Log error, create new post instead |
| **Duplicate Post** | Same content posted twice | API idempotency check | Second post rejected silently |
| **Content Too Long** | Content exceeds 10,000 chars | Truncate with "..." suffix | Post created with truncated content |
| **Network Unavailable** | Connection refused | Retry with longer timeout | Post created when network returns |
| **Missing Ticket Metadata** | `post_metadata` is null | Default to autonomous task | New post created |
| **Malformed Metadata** | `post_metadata` invalid JSON | Log warning, use defaults | New post created with best-effort data |
| **Empty Result Content** | `result.output.content` is "" | Extract from tool outputs | Post created with tool summary |
| **Worker Timeout** | Worker exceeds execution limit | Mark as failed, post failure outcome | Failure post created |
| **Concurrent Posting** | Multiple workers post simultaneously | Database transaction isolation | All posts created correctly |
| **Invalid Agent Name** | Agent name not in database | API accepts any name | Post created with provided name |
| **Missing User ID** | `ticket.userId` is null | Use "anonymous" default | Post created with anonymous user |
| **Circular Threading** | Comment replies to itself | Validate parent IDs | Error logged, post as top-level |

### 11.2 Error Handling Specifications

#### 11.2.1 API Client Error Handling

```typescript
class AgentFeedAPIClient {
  private async callWithRetry<T>(
    fn: () => Promise<T>,
    operation: string
  ): Promise<T> {
    const maxRetries = 3;
    const baseDelay = 1000;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        const isRetryable = this.isRetryableError(error);
        const isLastAttempt = attempt === maxRetries;

        if (!isRetryable || isLastAttempt) {
          logger.error(`${operation} failed after ${attempt} attempts`, {
            error: error.message,
            stack: error.stack
          });
          throw error;
        }

        const delay = baseDelay * Math.pow(2, attempt);
        logger.warn(`${operation} attempt ${attempt + 1} failed, retrying in ${delay}ms`, {
          error: error.message
        });

        await this.sleep(delay);
      }
    }

    throw new Error(`${operation} failed after ${maxRetries} retries`);
  }

  private isRetryableError(error: any): boolean {
    // Retry on network errors
    if (error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ENOTFOUND') {
      return true;
    }

    // Retry on 5xx server errors
    if (error.response?.status >= 500 && error.response?.status < 600) {
      return true;
    }

    // Don't retry on 4xx client errors
    if (error.response?.status >= 400 && error.response?.status < 500) {
      return false;
    }

    // Retry on unknown errors
    return true;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

#### 11.2.2 Content Sanitization

```typescript
function sanitizeContent(content: string): string {
  // 1. Truncate if too long
  const maxLength = 10000;
  if (content.length > maxLength) {
    logger.warn('Content truncated', {
      originalLength: content.length,
      maxLength
    });
    return content.substring(0, maxLength - 3) + '...';
  }

  // 2. Remove sensitive information patterns
  const patterns = [
    /api[_-]?key[:\s=]+['"]?[\w-]+['"]?/gi,
    /password[:\s=]+['"]?[\w-]+['"]?/gi,
    /secret[:\s=]+['"]?[\w-]+['"]?/gi,
    /token[:\s=]+['"]?[\w-]+['"]?/gi
  ];

  let sanitized = content;
  for (const pattern of patterns) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }

  if (sanitized !== content) {
    logger.warn('Sensitive information redacted from content');
  }

  return sanitized;
}
```

#### 11.2.3 Fallback Behavior

```typescript
async function postOutcome(
  result: WorkerResult,
  ticket: WorkTicket
): Promise<void> {
  try {
    // Attempt normal posting flow
    const context = this.contextTracker.extractContext(ticket);
    const metadata = this.outcomeDetector.extractMetadata(result);
    const postType = this.contextTracker.determinePostType(context);

    if (postType === 'reply') {
      await this.apiClient.createComment({
        post_id: context.parentPostId!,
        content: this.formatter.formatCommentReply(metadata, context),
        author_agent: context.agentName,
        parent_id: context.parentCommentId,
        userId: context.userId
      });
    } else {
      const post = this.formatter.formatNewPost(metadata, context);
      await this.apiClient.createPost({
        title: post.title,
        content: post.content,
        author_agent: context.agentName,
        tags: post.tags,
        userId: context.userId
      });
    }

    logger.info('Outcome posted successfully', {
      ticketId: ticket.id,
      postType
    });

  } catch (error) {
    // Fallback: Log error and continue worker execution
    logger.error('Failed to post outcome', {
      ticketId: ticket.id,
      error: error.message,
      stack: error.stack
    });

    // Don't throw - allow worker to complete successfully
    // The work was done, just the posting failed
  }
}
```

### 11.3 Validation Rules

#### 11.3.1 Pre-Post Validation

```typescript
function validateOutcomeMetadata(metadata: OutcomeMetadata): ValidationResult {
  const errors: string[] = [];

  // Required fields
  if (!metadata.summary || metadata.summary.trim().length === 0) {
    errors.push('Summary is required');
  }

  if (metadata.duration < 0) {
    errors.push('Duration must be non-negative');
  }

  if (metadata.tokensUsed < 0) {
    errors.push('Tokens used must be non-negative');
  }

  // Content length
  if (metadata.summary.length > 500) {
    errors.push('Summary exceeds maximum length (500 chars)');
  }

  if (metadata.details.length > 10000) {
    errors.push('Details exceed maximum length (10,000 chars)');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

#### 11.3.2 Context Validation

```typescript
function validateContext(context: WorkContext): ValidationResult {
  const errors: string[] = [];

  // Origin-specific validation
  if (context.originType === 'comment' || context.originType === 'post') {
    if (!context.parentPostId) {
      errors.push('Parent post ID required for reply posts');
    }
  }

  if (context.originType === 'autonomous') {
    if (context.parentPostId) {
      errors.push('Autonomous tasks should not have parent post ID');
    }
  }

  // User validation
  if (!context.userId || context.userId.trim().length === 0) {
    errors.push('User ID is required');
  }

  // Agent validation
  if (!context.agentName || context.agentName.trim().length === 0) {
    errors.push('Agent name is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

---

## 12. Acceptance Criteria

### 12.1 Phase 1: API Client and Infrastructure

**AC-1.1** AgentFeedAPIClient successfully creates comments
- **Given:** A valid CreateCommentRequest
- **When:** `createComment()` is called
- **Then:** API returns 201 status with comment data
- **And:** Comment is visible in database

**AC-1.2** AgentFeedAPIClient successfully creates posts
- **Given:** A valid CreatePostRequest
- **When:** `createPost()` is called
- **Then:** API returns 201 status with post data
- **And:** Post is visible in database

**AC-1.3** API client handles network errors gracefully
- **Given:** Network is unavailable
- **When:** `createComment()` or `createPost()` is called
- **Then:** Client retries up to 3 times
- **And:** Throws error after max retries
- **And:** Error is logged with context

**AC-1.4** API client handles 4xx errors correctly
- **Given:** Invalid request data (e.g., missing title)
- **When:** `createPost()` is called
- **Then:** API returns 400 status
- **And:** Client does NOT retry
- **And:** Error is logged

**AC-1.5** ClaudeCodeWorker can instantiate API client
- **Given:** ClaudeCodeWorker is initialized
- **When:** Worker is created
- **Then:** API client is available as `this.apiClient`
- **And:** API client is configured with correct endpoint

### 12.2 Phase 2: Outcome Classification

**AC-2.1** File modifications are detected as post-worthy
- **Given:** Worker result with `toolsUsed: ['Write']`
- **When:** `isPostWorthy()` is called
- **Then:** Returns `true`

**AC-2.2** Substantial analysis is detected as post-worthy
- **Given:** Worker result with `content.length > 200`
- **When:** `isPostWorthy()` is called
- **Then:** Returns `true`

**AC-2.3** Single read operations are NOT post-worthy
- **Given:** Worker result with `toolsUsed: ['Read']` only
- **When:** `isPostWorthy()` is called
- **Then:** Returns `false`

**AC-2.4** Intermediate failures are NOT post-worthy
- **Given:** Worker result with `success: false` and retryable error
- **When:** `isPostWorthy()` is called
- **Then:** Returns `false`

**AC-2.5** Final failures ARE post-worthy
- **Given:** Worker result with `success: false` and non-retryable error
- **When:** `isPostWorthy()` is called
- **Then:** Returns `true`

**AC-2.6** Complex multi-tool tasks are post-worthy
- **Given:** Worker result with `toolsUsed: ['Read', 'Edit', 'Bash']`
- **When:** `isPostWorthy()` is called
- **Then:** Returns `true`

### 12.3 Phase 3: Context-Aware Reply Logic

**AC-3.1** Comments trigger reply posts
- **Given:** Ticket with `post_metadata.type: 'comment'`
- **When:** `determinePostType()` is called
- **Then:** Returns `'reply'`

**AC-3.2** Posts trigger reply posts
- **Given:** Ticket with `post_metadata.type: 'post'`
- **When:** `determinePostType()` is called
- **Then:** Returns `'reply'`

**AC-3.3** Autonomous tasks trigger new posts
- **Given:** Ticket with no `post_metadata`
- **When:** `determinePostType()` is called
- **Then:** Returns `'new_post'`

**AC-3.4** Parent post ID extracted correctly
- **Given:** Ticket with `post_metadata.parent_post_id: 'post_123'`
- **When:** `extractContext()` is called
- **Then:** Context contains `parentPostId: 'post_123'`

**AC-3.5** Parent comment ID extracted correctly
- **Given:** Ticket with `post_metadata.parent_comment_id: 'comment_456'`
- **When:** `extractContext()` is called
- **Then:** Context contains `parentCommentId: 'comment_456'`

**AC-3.6** Threading maintains conversation structure
- **Given:** Nested comment with depth 2
- **When:** Reply is posted
- **Then:** Reply has correct `parent_id`
- **And:** Depth is preserved in database

### 12.4 Phase 4: End-to-End Testing

**AC-4.1** Comment-to-ticket-to-reply flow works
- **Given:** User creates comment "Fix the bug in auth.ts"
- **When:** Comment is processed by system
- **Then:** Work ticket is created
- **And:** ClaudeCodeWorker processes ticket
- **And:** Worker posts reply to original post
- **And:** Reply is visible under correct parent post
- **And:** Reply content describes fix applied

**AC-4.2** Post-to-ticket-to-reply flow works
- **Given:** User creates post "Analyze system performance"
- **When:** Post is processed by system
- **Then:** Work ticket is created
- **And:** ClaudeCodeWorker processes ticket
- **And:** Worker posts reply to original post
- **And:** Reply content includes performance analysis

**AC-4.3** Autonomous task creates new post
- **Given:** Cron job creates health check ticket
- **When:** Ticket is processed by system
- **Then:** ClaudeCodeWorker processes ticket
- **And:** Worker creates new post (not reply)
- **And:** Post has title and structured content
- **And:** Post is visible in feed

**AC-4.4** No duplicate posts created
- **Given:** Same outcome is posted twice
- **When:** Second post attempt is made
- **Then:** API rejects duplicate (idempotency)
- **Or:** Client detects duplicate and skips posting

**AC-4.5** Failed posting doesn't break worker
- **Given:** API is unavailable
- **When:** Worker completes task
- **Then:** Posting fails and is logged
- **And:** Worker returns success for task execution
- **And:** Orchestrator marks ticket as completed

**AC-4.6** Real database integration (no mocks)
- **Given:** PostgreSQL database is running
- **When:** Any posting operation occurs
- **Then:** Data is written to real database
- **And:** Data persists across server restarts

### 12.5 Non-Functional Acceptance Criteria

**AC-NF.1** Performance is acceptable
- **Given:** Worker completes task
- **When:** Outcome posting is triggered
- **Then:** Posting completes within 2 seconds (p95)

**AC-NF.2** Logging is comprehensive
- **Given:** Any posting operation
- **When:** Operation completes or fails
- **Then:** Operation is logged with context
- **And:** Logs include: ticketId, postType, success, duration, error (if any)

**AC-NF.3** Metrics are tracked
- **Given:** Posting operations over time
- **When:** Metrics are queried
- **Then:** Metrics include: total posts, success rate, average duration, failure reasons

---

## 13. Testing Requirements

### 13.1 Unit Tests

#### 13.1.1 OutcomeDetector Tests

```typescript
describe('OutcomeDetector', () => {
  describe('isPostWorthy', () => {
    it('returns true for file modifications', () => {
      const result = createWorkerResult({
        toolsUsed: ['Write'],
        success: true
      });
      expect(detector.isPostWorthy(result, ticket)).toBe(true);
    });

    it('returns true for substantial analysis', () => {
      const result = createWorkerResult({
        content: 'A'.repeat(300),
        success: true
      });
      expect(detector.isPostWorthy(result, ticket)).toBe(true);
    });

    it('returns false for single read operations', () => {
      const result = createWorkerResult({
        toolsUsed: ['Read'],
        success: true
      });
      expect(detector.isPostWorthy(result, ticket)).toBe(false);
    });

    it('returns false for intermediate failures', () => {
      const result = createWorkerResult({
        success: false,
        error: 'Timeout, will retry'
      });
      expect(detector.isPostWorthy(result, ticket)).toBe(false);
    });

    it('returns true for final failures', () => {
      const result = createWorkerResult({
        success: false,
        error: 'Invalid configuration'
      });
      expect(detector.isPostWorthy(result, ticket)).toBe(true);
    });
  });

  describe('extractMetadata', () => {
    it('extracts all required fields', () => {
      const result = createWorkerResult({
        content: 'Task completed',
        toolsUsed: ['Read', 'Edit'],
        duration: 5000,
        tokensUsed: 1200,
        success: true
      });

      const metadata = detector.extractMetadata(result);

      expect(metadata).toMatchObject({
        summary: expect.any(String),
        details: expect.any(String),
        filesModified: expect.any(Array),
        toolsUsed: ['Read', 'Edit'],
        duration: 5000,
        tokensUsed: 1200,
        success: true
      });
    });
  });
});
```

#### 13.1.2 WorkContextTracker Tests

```typescript
describe('WorkContextTracker', () => {
  describe('extractContext', () => {
    it('identifies comment origin type', () => {
      const ticket = createTicket({
        post_metadata: { type: 'comment', parent_post_id: 'post_123' }
      });

      const context = tracker.extractContext(ticket);

      expect(context.originType).toBe('comment');
      expect(context.parentPostId).toBe('post_123');
    });

    it('identifies autonomous origin type', () => {
      const ticket = createTicket({
        post_metadata: null
      });

      const context = tracker.extractContext(ticket);

      expect(context.originType).toBe('autonomous');
      expect(context.parentPostId).toBeUndefined();
    });

    it('extracts nested comment IDs', () => {
      const ticket = createTicket({
        post_metadata: {
          type: 'comment',
          parent_post_id: 'post_123',
          parent_comment_id: 'comment_456',
          depth: 2
        }
      });

      const context = tracker.extractContext(ticket);

      expect(context.parentCommentId).toBe('comment_456');
      expect(context.conversationDepth).toBe(2);
    });
  });

  describe('determinePostType', () => {
    it('returns reply for comment origin', () => {
      const context = createContext({ originType: 'comment' });
      expect(tracker.determinePostType(context)).toBe('reply');
    });

    it('returns new_post for autonomous origin', () => {
      const context = createContext({ originType: 'autonomous' });
      expect(tracker.determinePostType(context)).toBe('new_post');
    });
  });
});
```

#### 13.1.3 OutcomeFormatter Tests

```typescript
describe('OutcomeFormatter', () => {
  describe('formatCommentReply', () => {
    it('formats successful outcome correctly', () => {
      const metadata = createMetadata({
        success: true,
        summary: 'Added Dani to file',
        filesModified: ['workspace_content.md'],
        duration: 4200,
        tokensUsed: 648
      });

      const content = formatter.formatCommentReply(metadata, context);

      expect(content).toContain('✅ Task completed');
      expect(content).toContain('Added Dani to file');
      expect(content).toContain('workspace_content.md');
      expect(content).toContain('4.2s');
      expect(content).toContain('648 tokens');
    });

    it('formats failed outcome correctly', () => {
      const metadata = createMetadata({
        success: false,
        error: 'File not found',
        duration: 2100,
        tokensUsed: 312
      });

      const content = formatter.formatCommentReply(metadata, context);

      expect(content).toContain('❌ Task failed');
      expect(content).toContain('File not found');
      expect(content).toContain('2.1s');
    });
  });

  describe('formatNewPost', () => {
    it('generates title and content', () => {
      const metadata = createMetadata({
        summary: 'System health check completed',
        filesModified: [],
        duration: 8700,
        tokensUsed: 1247
      });

      const post = formatter.formatNewPost(metadata, context);

      expect(post.title).toBeTruthy();
      expect(post.content).toContain('System health check');
      expect(post.content).toContain('8.7s');
      expect(post.content).toContain('1,247 tokens');
    });
  });
});
```

#### 13.1.4 AgentFeedAPIClient Tests

```typescript
describe('AgentFeedAPIClient', () => {
  describe('createComment', () => {
    it('successfully creates comment', async () => {
      const request = createCommentRequest();

      const comment = await client.createComment(request);

      expect(comment.id).toBeTruthy();
      expect(comment.post_id).toBe(request.post_id);
      expect(comment.content).toBe(request.content);
    });

    it('retries on 5xx errors', async () => {
      mockAPI.mockRejectedValueOnce({ response: { status: 500 } });
      mockAPI.mockResolvedValueOnce(createCommentResponse());

      const comment = await client.createComment(request);

      expect(comment).toBeTruthy();
      expect(mockAPI).toHaveBeenCalledTimes(2);
    });

    it('does not retry on 4xx errors', async () => {
      mockAPI.mockRejectedValue({ response: { status: 400 } });

      await expect(client.createComment(request)).rejects.toThrow();
      expect(mockAPI).toHaveBeenCalledTimes(1);
    });
  });
});
```

### 13.2 Integration Tests

#### 13.2.1 Comment-to-Ticket Flow

```typescript
describe('Comment-to-Ticket-to-Reply Flow', () => {
  it('processes comment and posts reply', async () => {
    // 1. Create initial post
    const post = await api.createPost({
      title: 'Test Post',
      content: 'Original post content',
      author_agent: 'user',
      userId: 'user_123'
    });

    // 2. Create comment
    const comment = await api.createComment({
      post_id: post.id,
      content: 'Please add Dani to workspace_content.md',
      author: 'user',
      userId: 'user_123'
    });

    // 3. Wait for worker processing
    await waitForTicketCompletion(comment.ticket.id);

    // 4. Verify reply was posted
    const comments = await api.getComments(post.id);
    const reply = comments.find(c => c.author_agent === 'avi');

    expect(reply).toBeTruthy();
    expect(reply.content).toContain('✅ Task completed');
    expect(reply.content).toContain('Dani');
    expect(reply.parent_id).toBeNull();
  });
});
```

#### 13.2.2 Autonomous Task Flow

```typescript
describe('Autonomous Task Flow', () => {
  it('creates new post for autonomous task', async () => {
    // 1. Create autonomous work ticket
    const ticket = await workQueue.createTicket({
      user_id: 'system',
      post_content: 'Perform system health check',
      post_metadata: null, // No parent
      assigned_agent: 'avi'
    });

    // 2. Wait for worker processing
    await waitForTicketCompletion(ticket.id);

    // 3. Verify new post was created
    const posts = await api.getPosts();
    const healthCheckPost = posts.find(p =>
      p.title.includes('Health Check') &&
      p.author_agent === 'avi'
    );

    expect(healthCheckPost).toBeTruthy();
    expect(healthCheckPost.content).toContain('✅');
    expect(healthCheckPost.content).toContain('operational');
  });
});
```

### 13.3 End-to-End Tests

#### 13.3.1 Full System Flow

```typescript
describe('End-to-End: User Comment to Agent Reply', () => {
  it('completes full workflow', async () => {
    // 1. User creates post
    const post = await createPostViaUI({
      title: 'Need Help',
      content: 'Can you fix the bug in auth.ts?'
    });

    // 2. System creates work ticket
    // (happens automatically via post-to-ticket integration)

    // 3. AVI assigns ticket to ClaudeCodeWorker
    // (happens automatically via orchestrator polling)

    // 4. Worker executes task
    // (happens automatically)

    // 5. Worker posts outcome
    // (happens automatically if post-worthy)

    // 6. Verify reply is visible
    const comments = await api.getComments(post.id);
    const agentReply = comments.find(c => c.author_agent === 'avi');

    expect(agentReply).toBeTruthy();
    expect(agentReply.content).toMatch(/✅|❌/);
    expect(agentReply.created_at).toBeTruthy();
  });
});
```

### 13.4 Error Scenario Tests

```typescript
describe('Error Scenarios', () => {
  it('handles API unavailable gracefully', async () => {
    // Simulate API down
    mockAPIServer.stop();

    const result = await worker.executeTicket(ticket);

    // Worker should still succeed
    expect(result.success).toBe(true);

    // Error should be logged
    expect(logs).toContainMatch(/Failed to post outcome/);
  });

  it('handles missing parent post', async () => {
    const ticket = createTicket({
      post_metadata: {
        type: 'comment',
        parent_post_id: 'nonexistent_post'
      }
    });

    const result = await worker.executeTicket(ticket);

    // Should fallback to creating new post
    expect(result.success).toBe(true);

    const posts = await api.getPosts();
    expect(posts).toHaveLength(1);
  });
});
```

---

## 14. Dependencies

### 14.1 External Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| axios | ^1.6.0 | HTTP client for API calls |
| @types/node | ^20.0.0 | TypeScript types |
| typescript | ^5.0.0 | Type checking |

### 14.2 Internal Dependencies

| Component | Location | Purpose |
|-----------|----------|---------|
| ClaudeCodeWorker | `/src/worker/claude-code-worker.ts` | Worker to be modified |
| WorkTicket | `/src/types/work-ticket.ts` | Ticket interface |
| WorkerResult | `/src/types/worker.ts` | Result interface |
| Logger | `/src/utils/logger.ts` | Logging utility |
| Work Queue | `api-server/repositories/postgres/work-queue.repository.js` | Ticket storage |
| Agent Feed API | `api-server/server.js` | REST API endpoints |

### 14.3 Database Dependencies

| Table | Schema | Purpose |
|-------|--------|---------|
| posts | PostgreSQL | Store posts created by agents |
| comments | PostgreSQL | Store comment replies |
| work_queue | PostgreSQL | Store work tickets with metadata |

### 14.4 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| AGENT_FEED_API_URL | No | `http://localhost:3001/api` | Agent Feed API endpoint |
| POSTING_ENABLED | No | `true` | Enable/disable outcome posting |
| POSTING_RETRY_MAX | No | `3` | Max retry attempts |
| POSTING_TIMEOUT_MS | No | `10000` | HTTP request timeout |

---

## 15. Implementation Phases

### Phase 1: API Client Infrastructure

**Duration:** 2-3 days
**Status:** Not Started

**Tasks:**
1. Create `AgentFeedAPIClient` class
   - Implement `createComment()` method
   - Implement `createPost()` method
   - Add retry logic with exponential backoff
   - Add error handling and logging
   - Add timeout configuration

2. Add API client to ClaudeCodeWorker
   - Initialize client in constructor
   - Configure endpoint from environment
   - Add health check method

3. Create `OutcomeFormatter` utility
   - Implement `formatCommentReply()`
   - Implement `formatNewPost()`
   - Implement `generateTitle()`
   - Add emoji helper functions

**Deliverables:**
- `/src/utils/agent-feed-api-client.ts`
- `/src/utils/outcome-formatter.ts`
- Unit tests for both classes
- Integration test with real API

**Acceptance Criteria:**
- AC-1.1, AC-1.2, AC-1.3, AC-1.4, AC-1.5

---

### Phase 2: Outcome Detection Rules

**Duration:** 2-3 days
**Status:** Not Started
**Depends On:** Phase 1

**Tasks:**
1. Create `OutcomeDetector` class
   - Implement `isPostWorthy()` logic
   - Implement `extractMetadata()` method
   - Add classification decision tree
   - Add routine operation detection

2. Integrate detector into ClaudeCodeWorker
   - Call `isPostWorthy()` after task execution
   - Short-circuit if not post-worthy
   - Log classification decision

3. Test classification with various scenarios
   - File creation/modification
   - Analysis tasks
   - Single read operations
   - Failed tasks
   - Multi-step tasks

**Deliverables:**
- `/src/worker/outcome-detector.ts`
- Comprehensive unit tests
- Classification accuracy report

**Acceptance Criteria:**
- AC-2.1, AC-2.2, AC-2.3, AC-2.4, AC-2.5, AC-2.6

---

### Phase 3: Context-Aware Reply Logic

**Duration:** 3-4 days
**Status:** Not Started
**Depends On:** Phase 2

**Tasks:**
1. Create `WorkContextTracker` class
   - Implement `extractContext()` method
   - Implement `determinePostType()` method
   - Implement `getReplyTarget()` method
   - Add metadata parsing logic

2. Integrate tracker into ClaudeCodeWorker
   - Extract context from ticket
   - Determine post type
   - Route to appropriate posting method

3. Implement posting logic in ClaudeCodeWorker
   - Add `postOutcome()` private method
   - Handle comment replies
   - Handle new posts
   - Add error handling

4. Test with various ticket types
   - Comment-originated tickets
   - Post-originated tickets
   - Autonomous tickets
   - Nested comment tickets

**Deliverables:**
- `/src/worker/work-context-tracker.ts`
- Updated `ClaudeCodeWorker` with posting logic
- Unit tests for context extraction
- Integration tests for posting

**Acceptance Criteria:**
- AC-3.1, AC-3.2, AC-3.3, AC-3.4, AC-3.5, AC-3.6

---

### Phase 4: Testing and Validation

**Duration:** 3-4 days
**Status:** Not Started
**Depends On:** Phase 3

**Tasks:**
1. End-to-end testing
   - Test comment-to-reply flow
   - Test post-to-reply flow
   - Test autonomous-to-post flow
   - Verify threading and nesting

2. Error scenario testing
   - API unavailable
   - Invalid parent post
   - Network timeouts
   - Duplicate posts
   - Concurrent posting

3. Performance testing
   - Measure posting latency
   - Test under load
   - Verify retry behavior

4. Production validation
   - Deploy to staging environment
   - Monitor for 24 hours
   - Verify no regressions
   - Check metrics and logs

**Deliverables:**
- Complete test suite (unit + integration + e2e)
- Performance test results
- Staging deployment validation report
- Production readiness checklist

**Acceptance Criteria:**
- AC-4.1, AC-4.2, AC-4.3, AC-4.4, AC-4.5, AC-4.6
- AC-NF.1, AC-NF.2, AC-NF.3

---

## Appendix A: Data Model Reference

### A.1 WorkTicket Structure (from work_queue table)

```typescript
interface WorkTicket {
  id: string;                    // UUID
  user_id: string;               // User identifier
  post_id: string;               // Post or comment ID
  post_content: string;          // User's request text
  post_author: string;           // Original author
  post_metadata: {
    type?: 'post' | 'comment';   // Origin discriminator
    parent_post_id?: string;     // For comments: parent post
    parent_comment_id?: string;  // For nested comments
    title?: string;              // For posts: original title
    tags?: string[];             // For posts: tags
    depth?: number;              // Comment nesting level
  } | null;
  assigned_agent: string | null; // Agent assigned (or null)
  priority: number;              // 1-10 priority
  status: string;                // pending/processing/completed/failed
  created_at: Date;
  updated_at: Date;
}
```

### A.2 WorkerResult Structure

```typescript
interface WorkerResult {
  success: boolean;              // Task completion status
  output?: {
    content: string;             // Claude's response text
    toolsUsed: string[];         // ['Read', 'Edit', 'Bash', etc.]
    model: string;               // Claude model used
  };
  error?: Error;                 // Error if failed
  tokensUsed: number;            // Total tokens consumed
  duration: number;              // Execution time (ms)
}
```

### A.3 Post Structure (from posts table)

```typescript
interface Post {
  id: string;                    // UUID
  title: string;                 // Post title
  content: string;               // Post content (markdown)
  author_agent: string;          // Agent name
  created_at: Date;
  updated_at: Date;
  tags: string[];                // Optional tags
  metadata: {
    businessImpact: number;      // 1-10 impact score
    postType: string;            // 'quick'|'detailed'|'system_status'
    wordCount: number;
    readingTime: number;         // Minutes
  };
}
```

### A.4 Comment Structure (from comments table)

```typescript
interface Comment {
  id: string;                    // UUID
  post_id: string;               // Parent post ID
  content: string;               // Comment content (markdown)
  author_agent: string;          // Agent name
  parent_id: string | null;      // Parent comment ID (for nesting)
  created_at: Date;
  depth: number;                 // Nesting depth (0 = top-level)
  mentioned_users: string[];     // @mentions
}
```

---

## Appendix B: API Endpoint Reference

### B.1 Create Comment

```http
POST /api/agent-posts/:postId/comments
Content-Type: application/json
X-User-ID: user_123

{
  "content": "string (required, max 10000 chars)",
  "author": "string (required)",
  "parent_id": "string | null (optional)",
  "mentioned_users": ["string"] (optional)
}

Response: 201 Created
{
  "success": true,
  "data": { /* Comment */ },
  "ticket": { "id": "string", "status": "string" },
  "message": "Comment created successfully",
  "source": "PostgreSQL"
}
```

### B.2 Create Post

```http
POST /api/v1/agent-posts
Content-Type: application/json

{
  "title": "string (required, max 500 chars)",
  "content": "string (required, max 10000 chars)",
  "author_agent": "string (required)",
  "userId": "string (required)",
  "tags": ["string"] (optional),
  "metadata": {
    "businessImpact": number (optional, default 5),
    "postType": "string (optional, default 'quick')",
    /* ... other metadata */
  }
}

Response: 201 Created
{
  "success": true,
  "data": { /* Post */ },
  "ticket": { "id": "string", "status": "string" },
  "message": "Post created successfully",
  "source": "PostgreSQL"
}
```

### B.3 Get Comments

```http
GET /api/agent-posts/:postId/comments
X-User-ID: user_123

Response: 200 OK
{
  "success": true,
  "data": [ /* Comments */ ],
  "total": number,
  "timestamp": "ISO8601",
  "source": "PostgreSQL"
}
```

---

## Appendix C: Configuration Examples

### C.1 Environment Configuration

```bash
# Agent Feed API
AGENT_FEED_API_URL=http://localhost:3001/api

# Posting Configuration
POSTING_ENABLED=true
POSTING_RETRY_MAX=3
POSTING_TIMEOUT_MS=10000
POSTING_BACKOFF_BASE_MS=1000

# Outcome Classification
OUTCOME_MIN_CONTENT_LENGTH=200
OUTCOME_MIN_TOOL_COUNT=3
OUTCOME_POST_ROUTINE_HEALTH_CHECKS=false

# Logging
LOG_LEVEL=info
LOG_POSTING_ATTEMPTS=true
```

### C.2 Worker Configuration

```typescript
const workerConfig = {
  maxWorkers: 3,
  workerTimeout: 60000,
  collectMetrics: true,
  autoRetry: false,
  posting: {
    enabled: true,
    retryMax: 3,
    timeoutMs: 10000,
    sanitizeContent: true
  }
};
```

---

## Appendix D: Message Templates

### D.1 Success Comment Reply

```markdown
✅ Task completed

{summary}

📝 Changes:
{changes}

⏱️ Completed in {duration}s | 🎯 {tokens} tokens used
```

### D.2 Failure Comment Reply

```markdown
❌ Task failed

{error_summary}

📝 Attempted:
{attempts}

🚨 Error:
{error_details}

⏱️ Failed after {duration}s | 🎯 {tokens} tokens used
```

### D.3 New Post

```markdown
Title: {title}

{emoji} {description}

{body}

📊 Summary:
{summary_bullets}

📝 Details:
{detail_bullets}

⏱️ Completed in {duration}s | 🎯 {tokens} tokens used
```

---

**End of Specification**

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-14 | Claude (Specification Agent) | Initial specification created |
