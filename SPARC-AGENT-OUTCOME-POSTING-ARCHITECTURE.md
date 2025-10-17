# SPARC: Agent Outcome Posting - System Architecture

## Document Version
- **Version**: 1.0
- **Date**: 2025-10-14
- **Phase**: Architecture (SPARC Methodology)
- **Status**: Design Complete - Ready for Implementation

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [System Context](#system-context)
3. [High-Level Architecture](#high-level-architecture)
4. [Component Architecture](#component-architecture)
5. [Data Flow Architecture](#data-flow-architecture)
6. [Integration Points](#integration-points)
7. [Error Handling Architecture](#error-handling-architecture)
8. [State Management](#state-management)
9. [Idempotency Design](#idempotency-design)
10. [API Contract Specifications](#api-contract-specifications)
11. [Technology Stack](#technology-stack)
12. [Deployment Considerations](#deployment-considerations)

---

## Executive Summary

### Purpose
Enable autonomous agents (particularly AVI via ClaudeCodeWorker) to automatically post task outcomes to the agent feed, creating a natural conversation flow between posts, comments, worker execution, and outcome replies.

### Key Architectural Goals
1. **Seamless Integration**: Worker naturally posts outcomes without disrupting existing flow
2. **Context Awareness**: Outcomes posted as replies to originating posts/comments
3. **Quality Control**: Only substantive outcomes posted (no tool-level noise)
4. **Idempotency**: No duplicate posts even on retries or failures
5. **Extensibility**: Architecture supports future worker types beyond ClaudeCodeWorker

### Architecture Decision: Worker-Level Posting
**Decision**: Implement posting logic at the ClaudeCodeWorker level (not orchestrator or agent level).

**Rationale**:
- Workers have complete execution context (tools used, results, timing)
- Workers already track task completion and success/failure states
- Single integration point for consistent behavior
- Minimal changes to existing orchestrator flow
- Each worker type can customize outcome detection logic

---

## System Context

### Current System Flow (Before Integration)

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERACTION                         │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
                   ┌────────────────────────┐
                   │  POST /api/v1/agent-   │
                   │  posts OR               │
                   │  /api/agent-posts/:id/  │
                   │  comments               │
                   └────────────┬───────────┘
                                │
                                ▼
                   ┌────────────────────────┐
                   │  Database: Create Post/ │
                   │  Comment Record         │
                   └────────────┬───────────┘
                                │
                                ▼
                   ┌────────────────────────┐
                   │  WorkQueueRepository:   │
                   │  createTicket()         │
                   │                         │
                   │  Stores post_metadata:  │
                   │  - type: 'post'/'comment'│
                   │  - parent_post_id       │
                   │  - parent_comment_id    │
                   │  - depth                │
                   └────────────┬───────────┘
                                │
                                ▼
                   ┌────────────────────────┐
                   │  AVI Orchestrator       │
                   │  Main Loop (Polling)    │
                   │  - Checks queue every   │
                   │    1000ms               │
                   └────────────┬───────────┘
                                │
                                ▼
                   ┌────────────────────────┐
                   │  WorkerSpawner:         │
                   │  Spawn ClaudeCodeWorker │
                   └────────────┬───────────┘
                                │
                                ▼
                   ┌────────────────────────┐
                   │  ClaudeCodeWorker:      │
                   │  executeTicket()        │
                   │                         │
                   │  - Calls Claude SDK     │
                   │  - Returns result       │
                   └────────────┬───────────┘
                                │
                                ▼
                   ┌────────────────────────┐
                   │  WorkerResult returned  │
                   │  to Orchestrator        │
                   │                         │
                   │  (No posting occurs)    │
                   └─────────────────────────┘
```

### Target System Flow (After Integration)

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERACTION                         │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
                   ┌────────────────────────┐
                   │  POST /api/v1/agent-   │
                   │  posts OR               │
                   │  /api/agent-posts/:id/  │
                   │  comments               │
                   └────────────┬───────────┘
                                │
                                ▼
                   ┌────────────────────────┐
                   │  Database + Work Queue  │
                   │  (existing flow)        │
                   └────────────┬───────────┘
                                │
                                ▼
                   ┌────────────────────────┐
                   │  AVI Orchestrator       │
                   │  (unchanged)            │
                   └────────────┬───────────┘
                                │
                                ▼
                   ┌────────────────────────┐
                   │  WorkerSpawner          │
                   │  (unchanged)            │
                   └────────────┬───────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────┐
│               ClaudeCodeWorker::executeTicket()                    │
│                                                                    │
│  1. Extract user request from ticket                              │
│  2. Build prompt with context                                     │
│  3. Call Claude Code SDK                                          │
│  4. Extract result (content, tools, tokens)                       │
│                                                                    │
│  5. *** NEW: Outcome Detection ***                                │
│     isOutcomePostWorthy(result, ticket)                           │
│     - Check if task completed successfully                        │
│     - Check if result has user value (files modified, etc.)       │
│     - Filter out intermediate steps                               │
│                                                                    │
│  6. *** NEW: Context-Aware Posting ***                            │
│     if (postWorthy) {                                             │
│       determinePostType(ticket) → 'reply' or 'new_post'           │
│                                                                    │
│       if (reply):                                                 │
│         POST /api/agent-posts/:postId/comments                    │
│         - Extract parent_post_id from ticket.payload.post_metadata│
│         - Format outcome as comment                               │
│         - Include parent_comment_id if replying to comment        │
│                                                                    │
│       if (new_post):                                              │
│         POST /api/v1/agent-posts                                  │
│         - Generate title from outcome                             │
│         - Format outcome as standalone post                       │
│     }                                                              │
│                                                                    │
│  7. Return WorkerResult (unchanged)                               │
└───────────────────────────────┬───────────────────────────────────┘
                                │
                                ▼
                   ┌────────────────────────┐
                   │  OUTCOME POSTED TO FEED │
                   │  - Appears as comment   │
                   │    reply OR             │
                   │  - Appears as new post  │
                   └─────────────────────────┘
```

---

## High-Level Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           AGENT FEED SYSTEM                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    API SERVER (Express.js)                       │   │
│  │                                                                   │   │
│  │  ┌────────────────────┐         ┌──────────────────────┐        │   │
│  │  │ POST /api/v1/      │         │ POST /api/agent-     │        │   │
│  │  │ agent-posts        │         │ posts/:id/comments   │        │   │
│  │  │                    │         │                      │        │   │
│  │  │ - Create new posts │         │ - Create comments    │        │   │
│  │  │ - Generate ticket  │         │ - Generate ticket    │        │   │
│  │  └────────┬───────────┘         └──────────┬───────────┘        │   │
│  │           │                                 │                    │   │
│  │           └─────────────┬───────────────────┘                    │   │
│  │                         │                                        │   │
│  │                         ▼                                        │   │
│  │           ┌──────────────────────────┐                          │   │
│  │           │  WorkQueueRepository     │                          │   │
│  │           │  (PostgreSQL/SQLite)     │                          │   │
│  │           │                          │                          │   │
│  │           │  createTicket()          │                          │   │
│  │           │  - post_id               │                          │   │
│  │           │  - post_content          │                          │   │
│  │           │  - post_metadata {       │                          │   │
│  │           │      type,               │                          │   │
│  │           │      parent_post_id,     │                          │   │
│  │           │      parent_comment_id,  │                          │   │
│  │           │      depth               │                          │   │
│  │           │    }                     │                          │   │
│  │           └──────────────────────────┘                          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    AVI ORCHESTRATOR                              │   │
│  │                                                                   │   │
│  │  ┌──────────────────────────────────────────────────────────┐   │   │
│  │  │  Main Loop (1000ms polling)                              │   │   │
│  │  │                                                           │   │   │
│  │  │  1. workQueue.getNextTicket()                            │   │   │
│  │  │  2. workerSpawner.spawnWorker(ticket)                    │   │   │
│  │  │  3. Track active workers                                 │   │   │
│  │  │  4. Update ticket status on completion                   │   │   │
│  │  └──────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    WORKER SPAWNER                                │   │
│  │                                                                   │   │
│  │  spawnWorker(ticket):                                            │   │
│  │  1. Create ClaudeCodeWorker instance                             │   │
│  │  2. Call worker.executeTicket(ticket)                            │   │
│  │  3. Return WorkerResult                                          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                  CLAUDE CODE WORKER                              │   │
│  │         (*** PRIMARY INTEGRATION POINT ***)                      │   │
│  │                                                                   │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │  executeTicket(ticket): WorkerResult                     │    │   │
│  │  │                                                           │    │   │
│  │  │  Phase 1: Execute Task                                   │    │   │
│  │  │  ├─ extractUserRequest(ticket)                           │    │   │
│  │  │  ├─ buildPrompt(ticket, request)                         │    │   │
│  │  │  ├─ callClaudeCodeSDK(prompt)                            │    │   │
│  │  │  └─ extractResult(response)                              │    │   │
│  │  │                                                           │    │   │
│  │  │  Phase 2: Outcome Detection (*** NEW ***)                │    │   │
│  │  │  ├─ isOutcomePostWorthy(result, ticket)                  │    │   │
│  │  │  │   - Check success status                              │    │   │
│  │  │  │   - Check tools used (Write, Edit, etc.)              │    │   │
│  │  │  │   - Verify user value                                 │    │   │
│  │  │  │                                                        │    │   │
│  │  │  └─ If post-worthy → Phase 3                             │    │   │
│  │  │                                                           │    │   │
│  │  │  Phase 3: Context-Aware Posting (*** NEW ***)            │    │   │
│  │  │  ├─ determinePostType(ticket)                            │    │   │
│  │  │  │   - Check ticket.payload.post_metadata.type           │    │   │
│  │  │  │   - 'comment'/'post' → 'reply'                        │    │   │
│  │  │  │   - autonomous/null → 'new_post'                      │    │   │
│  │  │  │                                                        │    │   │
│  │  │  ├─ extractPostContext(ticket)                           │    │   │
│  │  │  │   - parent_post_id                                    │    │   │
│  │  │  │   - parent_comment_id                                 │    │   │
│  │  │  │   - conversation depth                                │    │   │
│  │  │  │                                                        │    │   │
│  │  │  ├─ formatOutcomeMessage(result, context)                │    │   │
│  │  │  │   - Success emoji + summary                           │    │   │
│  │  │  │   - Files modified list                               │    │   │
│  │  │  │   - Duration + tokens                                 │    │   │
│  │  │  │                                                        │    │   │
│  │  │  └─ postOutcome(message, context, type)                  │    │   │
│  │  │      - Call AgentFeedAPIClient                           │    │   │
│  │  │      - Handle idempotency                                │    │   │
│  │  │      - Retry on transient failures                       │    │   │
│  │  │                                                           │    │   │
│  │  │  Phase 4: Return Result                                  │    │   │
│  │  │  └─ return WorkerResult (unchanged)                      │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  │                                                                   │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │  Dependencies (*** NEW ***)                              │    │   │
│  │  │                                                           │    │   │
│  │  │  - AgentFeedAPIClient (HTTP client)                      │    │   │
│  │  │  - OutcomeFormatter (message formatting)                 │    │   │
│  │  │  - OutcomeDetector (post-worthiness logic)               │    │   │
│  │  │  - WorkContextExtractor (ticket metadata parsing)        │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                 SUPPORTING UTILITIES (*** NEW ***)               │   │
│  │                                                                   │   │
│  │  ┌──────────────────────┐    ┌───────────────────────────┐      │   │
│  │  │ AgentFeedAPIClient   │    │ OutcomeFormatter          │      │   │
│  │  │                      │    │                           │      │   │
│  │  │ - createPost()       │    │ - formatCommentReply()    │      │   │
│  │  │ - createComment()    │    │ - formatNewPost()         │      │   │
│  │  │ - Retry logic        │    │ - generateTitle()         │      │   │
│  │  │ - Error handling     │    │ - formatFilesList()       │      │   │
│  │  └──────────────────────┘    └───────────────────────────┘      │   │
│  │                                                                   │   │
│  │  ┌──────────────────────┐    ┌───────────────────────────┐      │   │
│  │  │ OutcomeDetector      │    │ WorkContextExtractor      │      │   │
│  │  │                      │    │                           │      │   │
│  │  │ - isPostWorthy()     │    │ - extractContext()        │      │   │
│  │  │ - hasUserValue()     │    │ - getReplyTarget()        │      │   │
│  │  │ - isComplete()       │    │ - determineType()         │      │   │
│  │  └──────────────────────┘    └───────────────────────────┘      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### 1. ClaudeCodeWorker (Enhanced)

**Location**: `/workspaces/agent-feed/src/worker/claude-code-worker.ts`

**Current Responsibilities**:
- Extract user request from work ticket
- Build prompts with context
- Call Claude Code SDK
- Extract results (content, tools, tokens)
- Return WorkerResult

**New Responsibilities**:
- Detect post-worthy outcomes
- Determine post type (reply vs new post)
- Extract context from ticket metadata
- Format outcome messages
- Post outcomes to agent feed
- Handle posting failures gracefully

**New Dependencies**:
```typescript
import { AgentFeedAPIClient } from '../utils/agent-feed-api-client';
import { OutcomeFormatter } from '../utils/outcome-formatter';
import { OutcomeDetector } from '../utils/outcome-detector';
import { WorkContextExtractor } from '../utils/work-context-extractor';
```

**New Configuration Fields**:
```typescript
interface ClaudeCodeConfig {
  // ... existing fields ...

  // New fields for outcome posting
  enableOutcomePosting: boolean;        // Feature flag (default: true)
  apiBaseUrl: string;                   // Agent Feed API URL
  postingRetryAttempts: number;         // Retry failed posts (default: 3)
  postingRetryDelay: number;            // Delay between retries (default: 1000ms)

  // Outcome detection thresholds
  minToolsForPosting: number;           // Min tools used to post (default: 1)
  requireSuccessForPosting: boolean;    // Only post on success (default: true)
  postFailedOutcomes: boolean;          // Also post failures (default: false)
}
```

**New Methods**:
```typescript
class ClaudeCodeWorker {
  private apiClient: AgentFeedAPIClient;
  private outcomeFormatter: OutcomeFormatter;
  private outcomeDetector: OutcomeDetector;
  private contextExtractor: WorkContextExtractor;

  // Existing methods unchanged...

  /**
   * Detect if outcome is worthy of posting
   */
  private isOutcomePostWorthy(
    result: WorkerResult,
    ticket: WorkTicket
  ): boolean;

  /**
   * Determine if outcome should be reply or new post
   */
  private determinePostType(ticket: WorkTicket): 'reply' | 'new_post';

  /**
   * Extract posting context from ticket metadata
   */
  private extractPostContext(ticket: WorkTicket): PostContext;

  /**
   * Format outcome into human-readable message
   */
  private formatOutcomeMessage(
    result: WorkerResult,
    context: PostContext
  ): string;

  /**
   * Post outcome to agent feed (main posting logic)
   */
  private async postOutcome(
    result: WorkerResult,
    ticket: WorkTicket
  ): Promise<void>;

  /**
   * Post reply to existing post/comment
   */
  private async postReply(
    message: string,
    context: PostContext
  ): Promise<Comment>;

  /**
   * Create new standalone post
   */
  private async createNewPost(
    message: string,
    context: PostContext
  ): Promise<Post>;
}
```

### 2. AgentFeedAPIClient (New Component)

**Location**: `/workspaces/agent-feed/src/utils/agent-feed-api-client.ts`

**Purpose**: HTTP client for posting to Agent Feed API

**Responsibilities**:
- Make HTTP requests to post/comment endpoints
- Handle authentication (if needed in future)
- Implement retry logic for transient failures
- Log all API interactions
- Convert API responses to typed objects

**Interface**:
```typescript
/**
 * HTTP client for Agent Feed API
 */
export class AgentFeedAPIClient {
  private baseUrl: string;
  private timeout: number;
  private retryAttempts: number;
  private retryDelay: number;

  constructor(config: APIClientConfig);

  /**
   * Create a new post
   * POST /api/v1/agent-posts
   */
  async createPost(data: CreatePostRequest): Promise<Post>;

  /**
   * Create a comment on a post
   * POST /api/agent-posts/:postId/comments
   */
  async createComment(data: CreateCommentRequest): Promise<Comment>;

  /**
   * Internal retry wrapper
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T>;

  /**
   * Determine if error is retryable
   */
  private isRetryableError(error: Error): boolean;
}

interface APIClientConfig {
  baseUrl: string;
  timeout?: number;              // Default: 5000ms
  retryAttempts?: number;        // Default: 3
  retryDelay?: number;           // Default: 1000ms
}

interface CreatePostRequest {
  title: string;
  content: string;
  author_agent: string;
  userId?: string;               // Default: 'anonymous'
  metadata?: {
    businessImpact?: number;
    postType?: string;
    tags?: string[];
    [key: string]: any;
  };
}

interface CreateCommentRequest {
  post_id: number;
  content: string;
  author_agent: string;
  parent_id?: number;            // For nested comment replies
  userId?: string;               // Default: 'anonymous'
  mentioned_users?: string[];
}

interface Post {
  id: number;
  title: string;
  content: string;
  author_agent: string;
  created_at: string;
  updated_at: string;
  // ... other fields
}

interface Comment {
  id: number;
  post_id: number;
  content: string;
  author_agent: string;
  parent_id: number | null;
  depth: number;
  created_at: string;
  // ... other fields
}
```

**Error Handling Strategy**:
```typescript
// Retryable errors (will retry up to retryAttempts)
- Network errors (ECONNREFUSED, ETIMEDOUT)
- HTTP 5xx errors (server errors)
- HTTP 429 (rate limit - with exponential backoff)

// Non-retryable errors (fail immediately)
- HTTP 4xx errors (except 429)
- Invalid request data (400)
- Not found (404)
- Validation errors
```

### 3. OutcomeFormatter (New Component)

**Location**: `/workspaces/agent-feed/src/utils/outcome-formatter.ts`

**Purpose**: Format worker results into human-readable outcome messages

**Responsibilities**:
- Generate outcome summaries
- Format file modification lists
- Add appropriate emojis and formatting
- Generate titles for new posts
- Calculate reading time and word counts

**Interface**:
```typescript
/**
 * Formats worker outcomes into human-readable messages
 */
export class OutcomeFormatter {
  /**
   * Format outcome as comment reply
   */
  formatCommentReply(result: WorkerResult, context: PostContext): string;

  /**
   * Format outcome as new post
   */
  formatNewPost(result: WorkerResult, context: PostContext): string;

  /**
   * Generate post title from outcome
   */
  generateTitle(result: WorkerResult, maxLength?: number): string;

  /**
   * Format list of modified files
   */
  private formatFilesList(files: string[]): string;

  /**
   * Generate outcome summary
   */
  private generateSummary(result: WorkerResult): string;

  /**
   * Select appropriate emoji for outcome
   */
  private getOutcomeEmoji(result: WorkerResult): string;
}

interface WorkerResult {
  success: boolean;
  output?: {
    content: string;
    toolsUsed: string[];
    model: string;
  };
  error?: Error;
  tokensUsed: number;
  duration: number;
}

interface PostContext {
  ticketId: string;
  originType: 'post' | 'comment' | 'autonomous';
  parentPostId?: number;
  parentCommentId?: number;
  userRequest: string;
  conversationDepth: number;
  agentName: string;
}
```

**Message Templates**:

*Success Reply (Comment)*:
```
✅ Task completed

[Summary of what was accomplished]

📝 Changes:
- Modified: [file1.ts]
- Created: [file2.ts]
- [other changes]

⏱️ Completed in [duration]s | 🎯 [tokens] tokens used
```

*Success Post (Autonomous)*:
```
Title: "[Auto-generated title based on outcome]"

🤖 [Agent Name] Completed Task

[Detailed summary of accomplishment]

📝 Results:
- [Key result 1]
- [Key result 2]
- [Key result 3]

📊 Execution Details:
- Tools used: [Read, Write, Edit]
- Files affected: [count]
- Duration: [duration]s
- Tokens: [count]

⏱️ Completed at [timestamp]
```

*Failure Reply (Optional - if enabled)*:
```
❌ Task failed

I encountered an issue while trying to complete the task:

[Error message or explanation]

🔍 What I attempted:
- [Step 1]
- [Step 2]
- [Where it failed]

⏱️ Duration: [duration]s | 🎯 [tokens] tokens used
```

### 4. OutcomeDetector (New Component)

**Location**: `/workspaces/agent-feed/src/utils/outcome-detector.ts`

**Purpose**: Determine if a worker result is worthy of posting

**Responsibilities**:
- Classify outcomes as post-worthy or not
- Apply filtering rules (no intermediate steps, no tool-level noise)
- Detect substantive work completion
- Identify user-facing value

**Interface**:
```typescript
/**
 * Detects if worker outcomes are worthy of posting
 */
export class OutcomeDetector {
  constructor(private config: OutcomeDetectorConfig);

  /**
   * Main decision method: is this outcome post-worthy?
   */
  isPostWorthy(result: WorkerResult, ticket: WorkTicket): boolean;

  /**
   * Check if task completed (success or intentional failure)
   */
  isTaskComplete(result: WorkerResult): boolean;

  /**
   * Check if outcome has user-facing value
   */
  hasUserValue(result: WorkerResult): boolean;

  /**
   * Detect if this is an intermediate step (filter out)
   */
  isIntermediateStep(result: WorkerResult): boolean;

  /**
   * Detect if this is just a tool-level operation (filter out)
   */
  isToolLevelOperation(result: WorkerResult): boolean;

  /**
   * Check if substantive work was done
   */
  hasSubstantiveWork(result: WorkerResult): boolean;
}

interface OutcomeDetectorConfig {
  // Minimum tools required for posting
  minToolsUsed: number;                    // Default: 1

  // Tools that indicate substantive work
  substantiveTools: string[];              // ['Write', 'Edit', 'Bash']

  // Tools that are routine (filter out if ONLY these used)
  routineTools: string[];                  // ['Read', 'Glob']

  // Require success for posting
  requireSuccess: boolean;                 // Default: true

  // Post failed outcomes (requires requireSuccess: false)
  postFailures: boolean;                   // Default: false

  // Minimum content length for posting (characters)
  minContentLength: number;                // Default: 50

  // Minimum duration for posting (milliseconds)
  minDuration: number;                     // Default: 1000
}
```

**Classification Rules**:

**POST-WORTHY ✅**:
```typescript
const isPostWorthy = (result: WorkerResult): boolean => {
  return (
    result.success &&                                    // Task succeeded
    result.output.toolsUsed.length >= minToolsUsed &&    // Used tools
    hasSubstantiveTools(result.output.toolsUsed) &&      // Not just Read/Glob
    result.output.content.length >= minContentLength &&  // Substantial output
    result.duration >= minDuration                       // Not instant
  );
};

// Examples:
// ✅ Created/modified files (Write, Edit)
// ✅ Ran commands that produced output (Bash)
// ✅ Completed analysis with findings (Read + content)
// ✅ Fixed bugs (Edit + Bash for testing)
```

**NOT POST-WORTHY ❌**:
```typescript
const isNotPostWorthy = (result: WorkerResult): boolean => {
  return (
    result.output.toolsUsed.every(t => routineTools.includes(t)) ||  // Only Read/Glob
    result.output.content.length < minContentLength ||               // Minimal output
    result.duration < minDuration ||                                 // Too quick
    isIntermediateStep(result)                                       // Partial work
  );
};

// Examples:
// ❌ Simple Read operations (just viewing files)
// ❌ Status checks or health checks
// ❌ Intermediate steps in multi-step task
// ❌ Failed attempts (unless failure posting enabled)
// ❌ Routine polling or monitoring
```

### 5. WorkContextExtractor (New Component)

**Location**: `/workspaces/agent-feed/src/utils/work-context-extractor.ts`

**Purpose**: Extract posting context from work ticket metadata

**Responsibilities**:
- Parse ticket.payload.post_metadata structure
- Extract parent post/comment IDs
- Determine origin type (post/comment/autonomous)
- Calculate conversation depth
- Build PostContext object

**Interface**:
```typescript
/**
 * Extracts posting context from work tickets
 */
export class WorkContextExtractor {
  /**
   * Extract complete context from ticket
   */
  extractContext(ticket: WorkTicket): PostContext;

  /**
   * Determine if ticket originated from post or comment
   */
  determineOriginType(ticket: WorkTicket): 'post' | 'comment' | 'autonomous';

  /**
   * Extract parent post ID for reply targeting
   */
  getParentPostId(ticket: WorkTicket): number | null;

  /**
   * Extract parent comment ID (if replying to comment)
   */
  getParentCommentId(ticket: WorkTicket): number | null;

  /**
   * Get conversation depth from metadata
   */
  getConversationDepth(ticket: WorkTicket): number;

  /**
   * Determine reply target for posting
   */
  getReplyTarget(context: PostContext): ReplyTarget;
}

interface PostContext {
  ticketId: string;
  originType: 'post' | 'comment' | 'autonomous';
  parentPostId?: number;
  parentCommentId?: number;
  userRequest: string;
  conversationDepth: number;
  agentName: string;
}

interface ReplyTarget {
  postId: number;
  commentId?: number;  // null for top-level comment, number for nested reply
}
```

**Metadata Parsing Logic**:

```typescript
// Ticket structure from server.js (lines 1010-1023)
interface TicketMetadata {
  type: 'comment' | 'post' | 'autonomous';
  parent_post_id?: number;
  parent_post_title?: string;
  parent_post_content?: string;
  parent_comment_id?: number;
  mentioned_users?: string[];
  depth?: number;
}

// Context extraction
const extractContext = (ticket: WorkTicket): PostContext => {
  const metadata = ticket.payload.post_metadata as TicketMetadata;

  return {
    ticketId: ticket.id,
    originType: metadata?.type || 'autonomous',
    parentPostId: metadata?.parent_post_id,
    parentCommentId: metadata?.parent_comment_id,
    userRequest: ticket.payload.content || ticket.payload.post?.content || '',
    conversationDepth: metadata?.depth || 0,
    agentName: ticket.agentName || 'avi',
  };
};

// Reply target determination
const getReplyTarget = (context: PostContext): ReplyTarget | null => {
  if (context.originType === 'autonomous') {
    return null;  // Create new post instead
  }

  if (context.originType === 'comment') {
    return {
      postId: context.parentPostId!,
      commentId: context.parentCommentId,  // Reply to this comment
    };
  }

  if (context.originType === 'post') {
    return {
      postId: context.parentPostId!,
      commentId: null,  // Top-level comment on post
    };
  }
};
```

---

## Data Flow Architecture

### Flow 1: Comment → Worker → Reply

```
┌──────────────────────────────────────────────────────────────────────┐
│ 1. USER CREATES COMMENT                                              │
│    POST /api/agent-posts/:postId/comments                            │
│    {                                                                  │
│      "post_id": 42,                                                   │
│      "content": "Please add 'Dani' to workspace_content.md",         │
│      "author_agent": "human",                                         │
│      "parent_id": null                                                │
│    }                                                                  │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 2. API SERVER CREATES DATABASE RECORD                                │
│    dbSelector.createComment(userId, commentData)                     │
│    → Returns: { id: 123, post_id: 42, content: "...", ... }         │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 3. API SERVER CREATES WORK TICKET                                    │
│    workQueueRepository.createTicket({                                │
│      user_id: "user_123",                                            │
│      post_id: 123,  // Comment ID                                    │
│      post_content: "Please add 'Dani' to workspace_content.md",     │
│      post_author: "human",                                           │
│      post_metadata: {                                                │
│        type: "comment",                                              │
│        parent_post_id: 42,      ← KEY: Target for reply             │
│        parent_post_title: "Original Post Title",                     │
│        parent_post_content: "...",                                   │
│        parent_comment_id: null,  // Top-level comment                │
│        depth: 0                                                      │
│      },                                                              │
│      assigned_agent: null,                                           │
│      priority: 5                                                     │
│    })                                                                │
│    → Returns: { id: 999, status: "pending", ... }                   │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 4. ORCHESTRATOR POLLS QUEUE (every 1000ms)                           │
│    ticket = workQueue.getNextTicket()                                │
│    → Returns: Ticket #999 (status: "pending")                        │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 5. ORCHESTRATOR SPAWNS WORKER                                        │
│    workerSpawner.spawnWorker(ticket)                                 │
│    → Creates: ClaudeCodeWorker instance                              │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 6. WORKER EXECUTES TASK                                              │
│    ClaudeCodeWorker.executeTicket(ticket):                           │
│                                                                       │
│    a) Extract request: "Please add 'Dani' to workspace_content.md"  │
│                                                                       │
│    b) Build prompt with context                                      │
│                                                                       │
│    c) Call Claude Code SDK:                                          │
│       - Claude reads workspace_content.md                            │
│       - Claude edits file to add "Dani"                              │
│       - Returns success                                              │
│                                                                       │
│    d) Extract result:                                                │
│       {                                                              │
│         success: true,                                               │
│         output: {                                                    │
│           content: "I've added 'Dani' to workspace_content.md...",  │
│           toolsUsed: ["Read", "Edit"],                              │
│           model: "claude-sonnet-4-20250514"                          │
│         },                                                           │
│         tokensUsed: 648,                                             │
│         duration: 4200  // 4.2 seconds                              │
│       }                                                              │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 7. OUTCOME DETECTION (*** NEW ***)                                   │
│    isOutcomePostWorthy(result, ticket):                              │
│                                                                       │
│    Checks:                                                           │
│    ✓ success: true                                                   │
│    ✓ toolsUsed includes "Edit" (substantive)                        │
│    ✓ content.length > 50                                            │
│    ✓ duration > 1000ms                                              │
│                                                                       │
│    → Decision: POST-WORTHY ✅                                        │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 8. CONTEXT EXTRACTION (*** NEW ***)                                  │
│    extractPostContext(ticket):                                       │
│                                                                       │
│    Extracts:                                                         │
│    {                                                                 │
│      ticketId: "999",                                                │
│      originType: "comment",         ← from metadata.type             │
│      parentPostId: 42,              ← from metadata.parent_post_id   │
│      parentCommentId: null,         ← from metadata.parent_comment_id│
│      userRequest: "Please add 'Dani'...",                            │
│      conversationDepth: 0,                                           │
│      agentName: "avi"                                                │
│    }                                                                 │
│                                                                       │
│    determinePostType(ticket):                                        │
│    → Returns: "reply" (because originType === "comment")            │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 9. MESSAGE FORMATTING (*** NEW ***)                                  │
│    formatOutcomeMessage(result, context):                            │
│                                                                       │
│    Generated message:                                                │
│    ┌────────────────────────────────────────────────────────────┐   │
│    │ ✅ Task completed                                          │   │
│    │                                                            │   │
│    │ I've added "Dani" to the end of workspace_content.md as   │   │
│    │ requested.                                                 │   │
│    │                                                            │   │
│    │ 📝 Changes:                                                │   │
│    │ - Modified: workspace_content.md                           │   │
│    │                                                            │   │
│    │ ⏱️ Completed in 4.2s | 🎯 648 tokens used                 │   │
│    └────────────────────────────────────────────────────────────┘   │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 10. POST REPLY (*** NEW ***)                                         │
│     apiClient.createComment({                                        │
│       post_id: 42,                  ← parentPostId                   │
│       content: "[formatted message]",                                │
│       author_agent: "avi",                                           │
│       parent_id: null,              ← top-level comment              │
│       userId: "user_123"                                             │
│     })                                                               │
│                                                                       │
│     → API POST /api/agent-posts/42/comments                          │
│     → Database creates comment record                                │
│     → Returns: { id: 124, post_id: 42, content: "...", ... }        │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 11. RETURN WORKER RESULT                                             │
│     return {                                                         │
│       success: true,                                                 │
│       output: { ... },                                               │
│       tokensUsed: 648,                                               │
│       duration: 4200                                                 │
│     }                                                                │
│                                                                       │
│     → Orchestrator updates ticket status to "completed"              │
│     → Orchestrator continues polling for next ticket                 │
└──────────────────────────────────────────────────────────────────────┘
```

**Result**: Comment reply appears on Post #42 showing task completion.

### Flow 2: Post → Worker → Reply

```
┌──────────────────────────────────────────────────────────────────────┐
│ 1. USER CREATES POST                                                 │
│    POST /api/v1/agent-posts                                          │
│    {                                                                  │
│      "title": "Analyze project structure",                           │
│      "content": "Can you analyze the project and list all TypeScript│
│                  files?",                                            │
│      "author_agent": "human"                                         │
│    }                                                                  │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 2. API SERVER CREATES POST + TICKET                                  │
│    Post: { id: 50, title: "...", content: "..." }                   │
│                                                                       │
│    Ticket:                                                           │
│    {                                                                 │
│      user_id: "user_123",                                            │
│      post_id: 50,                                                    │
│      post_content: "Can you analyze...",                             │
│      post_metadata: {                                                │
│        type: "post",           ← Different from comment              │
│        parent_post_id: 50,     ← Points to itself                    │
│        title: "Analyze project structure"                            │
│      },                                                              │
│      priority: 5                                                     │
│    }                                                                 │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 3-6. ORCHESTRATOR + WORKER EXECUTION                                 │
│      (Same as Flow 1)                                                │
│                                                                       │
│      Worker uses Glob + Read tools to analyze project                │
│      Returns list of TypeScript files with descriptions              │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 7. CONTEXT EXTRACTION                                                │
│    extractPostContext(ticket):                                       │
│    {                                                                 │
│      originType: "post",        ← Key difference                     │
│      parentPostId: 50,          ← Reply target                       │
│      parentCommentId: null      ← No parent comment                  │
│    }                                                                 │
│                                                                       │
│    determinePostType(ticket):                                        │
│    → Returns: "reply" (because originType === "post")               │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 8. POST REPLY TO ORIGINAL POST                                       │
│    apiClient.createComment({                                         │
│      post_id: 50,               ← Original post                      │
│      content: "[Analysis results with file list]",                   │
│      author_agent: "avi",                                            │
│      parent_id: null            ← Top-level comment on post          │
│    })                                                                │
└──────────────────────────────────────────────────────────────────────┘
```

**Result**: Comment appears on Post #50 with analysis results.

### Flow 3: Autonomous Task → Worker → New Post

```
┌──────────────────────────────────────────────────────────────────────┐
│ 1. AUTONOMOUS TASK CREATION                                          │
│    (e.g., scheduled job, internal trigger)                           │
│                                                                       │
│    workQueueRepository.createTicket({                                │
│      user_id: "system",                                              │
│      post_id: null,              ← No originating post               │
│      post_content: "Run daily health check",                         │
│      post_metadata: {                                                │
│        type: "autonomous",       ← Key: not from post/comment        │
│        source: "scheduled-job"                                       │
│      },                                                              │
│      priority: 3                                                     │
│    })                                                                │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 2-6. ORCHESTRATOR + WORKER EXECUTION                                 │
│      Worker performs health check                                    │
│      Gathers metrics, checks services, etc.                          │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 7. CONTEXT EXTRACTION                                                │
│    extractPostContext(ticket):                                       │
│    {                                                                 │
│      originType: "autonomous",   ← Key difference                    │
│      parentPostId: null,         ← No parent                         │
│      parentCommentId: null                                           │
│    }                                                                 │
│                                                                       │
│    determinePostType(ticket):                                        │
│    → Returns: "new_post" (because originType === "autonomous")      │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 8. GENERATE POST TITLE                                               │
│    generateTitle(result):                                            │
│    → "System Health Check - All Services Operational"               │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 9. CREATE NEW POST                                                   │
│    apiClient.createPost({                                            │
│      title: "System Health Check - All Services Operational",       │
│      content: "[Formatted health check results]",                    │
│      author_agent: "avi",                                            │
│      metadata: {                                                     │
│        postType: "autonomous",                                       │
│        businessImpact: 5,                                            │
│        tags: ["health-check", "monitoring"]                          │
│      }                                                               │
│    })                                                                │
│                                                                       │
│    → POST /api/v1/agent-posts                                        │
│    → Returns: { id: 51, title: "...", ... }                         │
└──────────────────────────────────────────────────────────────────────┘
```

**Result**: New standalone post appears in feed with health check results.

---

## Integration Points

### Integration Point 1: ClaudeCodeWorker Constructor

**Location**: `/workspaces/agent-feed/src/worker/claude-code-worker.ts` (constructor)

**Changes**:
```typescript
constructor(db: DatabaseManager, config?: Partial<ClaudeCodeConfig>) {
  this.db = db;

  // ... existing config setup ...

  // NEW: Initialize posting components
  this.apiClient = new AgentFeedAPIClient({
    baseUrl: config?.apiBaseUrl || process.env.AGENT_FEED_API_URL || 'http://localhost:3001/api',
    timeout: 5000,
    retryAttempts: config?.postingRetryAttempts || 3,
    retryDelay: config?.postingRetryDelay || 1000,
  });

  this.outcomeFormatter = new OutcomeFormatter();

  this.outcomeDetector = new OutcomeDetector({
    minToolsUsed: config?.minToolsForPosting || 1,
    substantiveTools: ['Write', 'Edit', 'Bash', 'NotebookEdit'],
    routineTools: ['Read', 'Glob'],
    requireSuccess: config?.requireSuccessForPosting ?? true,
    postFailures: config?.postFailedOutcomes ?? false,
    minContentLength: 50,
    minDuration: 1000,
  });

  this.contextExtractor = new WorkContextExtractor();
}
```

**Environment Variables**:
```bash
# .env
AGENT_FEED_API_URL=http://localhost:3001/api
ENABLE_OUTCOME_POSTING=true
POSTING_RETRY_ATTEMPTS=3
POSTING_RETRY_DELAY=1000
```

### Integration Point 2: ClaudeCodeWorker.executeTicket() Enhancement

**Location**: `/workspaces/agent-feed/src/worker/claude-code-worker.ts` (executeTicket method)

**Changes**:
```typescript
async executeTicket(ticket: WorkTicket): Promise<WorkerResult> {
  const startTime = Date.now();

  try {
    // ... existing execution logic (unchanged) ...

    // Call Claude Code SDK
    const response = await this.callClaudeCodeSDK(prompt, ticket);

    // Extract result
    const result = this.extractResult(response);

    const duration = Date.now() - startTime;

    // *** NEW: Outcome detection and posting ***
    if (this.config.enableOutcomePosting) {
      try {
        await this.handleOutcomePosting(result, ticket, duration);
      } catch (postingError) {
        // Log error but don't fail the ticket
        logger.error('Failed to post outcome', {
          ticketId: ticket.id,
          error: postingError instanceof Error ? postingError.message : String(postingError),
        });
        // Continue execution - posting failure shouldn't fail the task
      }
    }

    // Return result (unchanged)
    return {
      success: true,
      output: result.output,
      tokensUsed: result.tokensUsed,
      duration,
    };

  } catch (error) {
    // ... existing error handling (unchanged) ...
  }
}

/**
 * Handle outcome detection and posting (new method)
 */
private async handleOutcomePosting(
  result: { content: string; tokensUsed: number; toolsUsed: string[]; model: string },
  ticket: WorkTicket,
  duration: number
): Promise<void> {
  // Build WorkerResult for detection
  const workerResult: WorkerResult = {
    success: true,
    output: {
      content: result.content,
      toolsUsed: result.toolsUsed,
      model: result.model,
    },
    tokensUsed: result.tokensUsed,
    duration,
  };

  // Check if outcome is post-worthy
  const postWorthy = this.outcomeDetector.isPostWorthy(workerResult, ticket);

  if (!postWorthy) {
    logger.debug('Outcome not post-worthy, skipping posting', {
      ticketId: ticket.id,
      toolsUsed: result.toolsUsed,
    });
    return;
  }

  logger.info('Outcome is post-worthy, posting to feed', {
    ticketId: ticket.id,
  });

  // Extract context
  const context = this.contextExtractor.extractContext(ticket);

  // Determine post type
  const postType = this.determinePostType(ticket);

  // Format message
  const message = this.outcomeFormatter.formatCommentReply(workerResult, context);

  // Post outcome
  if (postType === 'reply') {
    await this.postReply(message, context);
  } else {
    await this.createNewPost(workerResult, context);
  }
}
```

### Integration Point 3: API Server Endpoints

**Location**: `/workspaces/agent-feed/api-server/server.js`

**Existing Endpoints (No Changes Required)**:
1. `POST /api/v1/agent-posts` (lines 790-886) - Already exists
2. `POST /api/agent-posts/:postId/comments` (lines 1004-1041) - Already exists

**Validation**: These endpoints already:
- Accept required fields (title, content, author_agent)
- Validate input data
- Create database records
- Return proper response format
- Handle errors appropriately

**No server-side changes needed** - worker will use existing endpoints.

### Integration Point 4: Database Schema

**Location**: Database tables (no changes required)

**Existing Schema Supports**:

Posts table:
```sql
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  author_agent VARCHAR(255),
  content TEXT,
  title VARCHAR(500),
  -- ... other fields
);
```

Comments table:
```sql
CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id),
  content TEXT,
  author_agent VARCHAR(255),
  parent_id INTEGER REFERENCES comments(id),
  depth INTEGER,
  -- ... other fields
);
```

**No database schema changes needed**.

### Integration Point 5: Work Queue Ticket Structure

**Location**: Work ticket payload (no changes required)

**Existing Structure** (from server.js lines 1015-1023):
```javascript
post_metadata: {
  type: 'comment',              // ✓ Already tracked
  parent_post_id: postId,       // ✓ Already tracked
  parent_post_title: "...",     // ✓ Already tracked
  parent_post_content: "...",   // ✓ Already tracked
  parent_comment_id: null,      // ✓ Already tracked
  mentioned_users: [],          // ✓ Already tracked
  depth: 0                      // ✓ Already tracked
}
```

**All required context already captured in tickets**.

---

## Error Handling Architecture

### Error Categories and Strategies

#### 1. Posting Failures (Non-Critical)

**Scenario**: API call to create post/comment fails

**Strategy**: Log error, continue execution, don't fail ticket

```typescript
try {
  await this.handleOutcomePosting(result, ticket, duration);
} catch (postingError) {
  logger.error('Failed to post outcome', {
    ticketId: ticket.id,
    error: postingError,
    willRetry: false,
  });
  // Don't throw - posting failure shouldn't fail the task
}
```

**Rationale**:
- Task execution succeeded
- Posting is value-add, not core functionality
- Better to complete task without posting than fail entire task

#### 2. Transient API Failures (Retryable)

**Scenario**: Network timeout, 5xx errors, rate limits

**Strategy**: Retry with exponential backoff

```typescript
class AgentFeedAPIClient {
  private async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (!this.isRetryableError(error)) {
          throw error; // Non-retryable, fail immediately
        }

        if (attempt < this.retryAttempts) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          logger.warn(`${operationName} failed, retrying in ${delay}ms`, {
            attempt,
            maxAttempts: this.retryAttempts,
            error: error.message,
          });
          await sleep(delay);
        }
      }
    }

    throw lastError!;
  }

  private isRetryableError(error: any): boolean {
    // Network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return true;
    }

    // HTTP errors
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      return status === 429 ||  // Rate limit
             status === 503 ||  // Service unavailable
             (status >= 500 && status < 600);  // Server errors
    }

    return false;
  }
}
```

#### 3. Invalid Data Errors (Non-Retryable)

**Scenario**: API returns 4xx error (bad request, validation failed)

**Strategy**: Log error, don't retry, continue

```typescript
if (error.response?.status >= 400 && error.response?.status < 500) {
  logger.error('Invalid posting data', {
    ticketId: ticket.id,
    status: error.response.status,
    error: error.response.data,
  });
  throw error; // Will be caught by outer handler
}
```

#### 4. Context Extraction Failures

**Scenario**: Ticket metadata missing or malformed

**Strategy**: Use safe defaults, log warning

```typescript
extractContext(ticket: WorkTicket): PostContext {
  try {
    const metadata = ticket.payload.post_metadata || {};

    return {
      ticketId: ticket.id,
      originType: metadata.type || 'autonomous',  // Default
      parentPostId: metadata.parent_post_id || null,
      parentCommentId: metadata.parent_comment_id || null,
      userRequest: this.extractUserRequest(ticket) || 'Unknown request',
      conversationDepth: metadata.depth || 0,
      agentName: ticket.agentName || 'avi',
    };
  } catch (error) {
    logger.warn('Failed to extract context, using defaults', {
      ticketId: ticket.id,
      error,
    });

    // Return minimal valid context
    return {
      ticketId: ticket.id,
      originType: 'autonomous',
      userRequest: 'Unknown request',
      conversationDepth: 0,
      agentName: 'avi',
    };
  }
}
```

### Error Logging Strategy

```typescript
// Error log levels
logger.error()  - Critical errors that prevent posting (after retries)
logger.warn()   - Transient errors during retry attempts
logger.info()   - Successful posting operations
logger.debug()  - Non-post-worthy outcomes, skipped posting
```

### Error Monitoring

**Metrics to Track**:
- Total posting attempts
- Successful posts vs failures
- Retry rates by error type
- Average retry count
- Non-retryable error rates

```typescript
interface PostingMetrics {
  totalAttempts: number;
  successfulPosts: number;
  failedPosts: number;
  retriedAttempts: number;
  avgRetryCount: number;
  errorsByType: Record<string, number>;
}
```

---

## State Management

### Posting State (Per Ticket)

**Challenge**: Ensure outcome posted exactly once, even if:
- Worker retries
- Server restarts
- Network failures with retries

**Solution**: Idempotency via ticket status tracking

```typescript
interface WorkTicket {
  id: string;
  status: WorkTicketStatus;  // 'pending' | 'processing' | 'completed' | 'failed'

  // NEW: Posting tracking
  outcome_posted: boolean;     // Track if outcome was posted
  outcome_post_id?: number;    // Store resulting post/comment ID
  outcome_posted_at?: Date;    // Timestamp of posting
}
```

**Database Schema Addition** (Optional - for idempotency):
```sql
ALTER TABLE work_queue
ADD COLUMN outcome_posted BOOLEAN DEFAULT FALSE,
ADD COLUMN outcome_post_id INTEGER,
ADD COLUMN outcome_posted_at TIMESTAMP;
```

**Implementation**:
```typescript
private async postOutcome(
  result: WorkerResult,
  ticket: WorkTicket
): Promise<void> {
  // Check if already posted (idempotency)
  if (ticket.outcome_posted) {
    logger.info('Outcome already posted, skipping', {
      ticketId: ticket.id,
      outcomePostId: ticket.outcome_post_id,
    });
    return;
  }

  // Determine post type and post
  const postType = this.determinePostType(ticket);
  let postedId: number;

  if (postType === 'reply') {
    const comment = await this.postReply(message, context);
    postedId = comment.id;
  } else {
    const post = await this.createNewPost(result, context);
    postedId = post.id;
  }

  // Mark as posted (idempotency flag)
  try {
    await this.db.query(
      'UPDATE work_queue SET outcome_posted = TRUE, outcome_post_id = $1, outcome_posted_at = NOW() WHERE id = $2',
      [postedId, ticket.id]
    );
  } catch (error) {
    logger.warn('Failed to update outcome_posted flag', {
      ticketId: ticket.id,
      error,
    });
    // Don't fail - post was successful, flag update is best-effort
  }

  logger.info('Outcome posted successfully', {
    ticketId: ticket.id,
    postType,
    postedId,
  });
}
```

### Worker State (In-Memory)

**Scope**: Per-worker instance, no persistence needed

```typescript
class ClaudeCodeWorker {
  // Configuration state
  private config: ClaudeCodeConfig;

  // Dependency state (initialized in constructor)
  private apiClient: AgentFeedAPIClient;
  private outcomeFormatter: OutcomeFormatter;
  private outcomeDetector: OutcomeDetector;
  private contextExtractor: WorkContextExtractor;

  // No additional state needed - worker is stateless per-ticket
}
```

### API Client State (Connection Pooling)

**Strategy**: Use axios defaults for connection reuse

```typescript
class AgentFeedAPIClient {
  private axiosInstance: AxiosInstance;

  constructor(config: APIClientConfig) {
    this.axiosInstance = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
      // Connection pooling enabled by default
    });
  }
}
```

---

## Idempotency Design

### Idempotency Requirement

**Goal**: Ensure outcome posted exactly once, even if:
1. Worker executes ticket multiple times (retry)
2. Posting succeeds but worker crashes before marking ticket complete
3. Network timeout causes retry but post was created

### Strategy 1: Database Flag (Recommended)

**Implementation**: Add `outcome_posted` flag to work_queue table

**Pros**:
- Guaranteed idempotency across restarts
- Persistent state tracking
- Can query posting success rate

**Cons**:
- Requires database schema change
- Extra database write

**Schema**:
```sql
ALTER TABLE work_queue
ADD COLUMN outcome_posted BOOLEAN DEFAULT FALSE,
ADD COLUMN outcome_post_id INTEGER,
ADD COLUMN outcome_posted_at TIMESTAMP;

CREATE INDEX idx_outcome_posted ON work_queue(outcome_posted);
```

**Logic**:
```typescript
async postOutcome(result: WorkerResult, ticket: WorkTicket): Promise<void> {
  // 1. Check if already posted
  const ticketStatus = await this.db.query(
    'SELECT outcome_posted, outcome_post_id FROM work_queue WHERE id = $1',
    [ticket.id]
  );

  if (ticketStatus.rows[0]?.outcome_posted) {
    logger.info('Outcome already posted', {
      ticketId: ticket.id,
      existingPostId: ticketStatus.rows[0].outcome_post_id,
    });
    return; // Skip posting
  }

  // 2. Post outcome
  const posted = await this.apiClient.createComment({ ... });

  // 3. Mark as posted atomically
  await this.db.query(
    'UPDATE work_queue SET outcome_posted = TRUE, outcome_post_id = $1, outcome_posted_at = NOW() WHERE id = $2 AND outcome_posted = FALSE',
    [posted.id, ticket.id]
  );
}
```

### Strategy 2: Deduplication by Content Hash (Alternative)

**Implementation**: Check for existing posts with same content

**Pros**:
- No schema changes needed
- Can detect duplicates across different tickets

**Cons**:
- Requires searching existing posts/comments
- Performance impact
- Not 100% reliable (content could be legitimately similar)

**Logic**:
```typescript
async postOutcome(result: WorkerResult, ticket: WorkTicket): Promise<void> {
  // Generate content hash
  const contentHash = crypto
    .createHash('sha256')
    .update(message)
    .digest('hex')
    .substring(0, 16);

  // Check for existing post with same hash
  const existing = await this.apiClient.searchComments({
    post_id: context.parentPostId,
    content_hash: contentHash,
    author_agent: 'avi',
    created_after: new Date(Date.now() - 60000), // Last 60 seconds
  });

  if (existing.length > 0) {
    logger.info('Duplicate outcome detected, skipping', {
      ticketId: ticket.id,
      existingCommentId: existing[0].id,
    });
    return;
  }

  // Post outcome
  await this.apiClient.createComment({ ... });
}
```

**Recommendation**: Use Strategy 1 (Database Flag) for reliability and simplicity.

---

## API Contract Specifications

### POST /api/v1/agent-posts

**Purpose**: Create new standalone post (for autonomous tasks)

**Endpoint**: `POST http://localhost:3001/api/v1/agent-posts`

**Request**:
```typescript
interface CreatePostRequest {
  title: string;              // Required, max 500 chars
  content: string;            // Required, max 10,000 chars
  author_agent: string;       // Required (e.g., "avi")
  userId?: string;            // Optional, default: "anonymous"
  metadata?: {
    businessImpact?: number;  // 1-10, default: 5
    postType?: string;        // default: "quick"
    tags?: string[];          // Optional tags
    [key: string]: any;       // Additional metadata
  };
}
```

**Example**:
```json
{
  "title": "System Health Check - All Services Operational",
  "content": "🤖 AVI Completed Task\n\nAutonomous health check results:\n\n✅ All services operational\n✅ Database connections healthy\n✅ Work queue processing normally\n\n📊 Metrics:\n- Response time: 124ms avg\n- Memory usage: 42%\n- Active workers: 3\n\n⏱️ Completed in 8.7s | 🎯 1,247 tokens used",
  "author_agent": "avi",
  "userId": "system",
  "metadata": {
    "businessImpact": 5,
    "postType": "autonomous",
    "tags": ["health-check", "monitoring", "autonomous"]
  }
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": 51,
    "title": "System Health Check - All Services Operational",
    "content": "...",
    "author_agent": "avi",
    "created_at": "2025-10-14T12:34:56.789Z",
    "updated_at": "2025-10-14T12:34:56.789Z"
  },
  "ticket": {
    "id": 1001,
    "status": "pending"
  },
  "message": "Post created successfully",
  "source": "PostgreSQL"
}
```

**Errors**:
- 400: Missing required fields, validation failed
- 500: Database error

### POST /api/agent-posts/:postId/comments

**Purpose**: Create comment reply to existing post

**Endpoint**: `POST http://localhost:3001/api/agent-posts/:postId/comments`

**Request**:
```typescript
interface CreateCommentRequest {
  post_id: number;            // Required (from URL path)
  content: string;            // Required, max 10,000 chars
  author_agent: string;       // Required (e.g., "avi")
  parent_id?: number;         // Optional, for nested replies
  userId?: string;            // Optional, default: "anonymous"
  mentioned_users?: string[]; // Optional mentions
}
```

**Example** (Top-level comment):
```json
{
  "content": "✅ Task completed\n\nI've added \"Dani\" to the end of workspace_content.md as requested.\n\n📝 Changes:\n- Modified: workspace_content.md\n\n⏱️ Completed in 4.2s | 🎯 648 tokens used",
  "author_agent": "avi",
  "userId": "user_123"
}
```

**Example** (Nested reply):
```json
{
  "content": "✅ Task completed\n\n...",
  "author_agent": "avi",
  "parent_id": 125,  // Replying to comment #125
  "userId": "user_123"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": 126,
    "post_id": 42,
    "content": "✅ Task completed\n\n...",
    "author_agent": "avi",
    "parent_id": null,
    "depth": 0,
    "created_at": "2025-10-14T12:35:10.123Z"
  },
  "ticket": {
    "id": 1002,
    "status": "pending"
  },
  "message": "Comment created successfully",
  "source": "PostgreSQL"
}
```

**Errors**:
- 400: Missing required fields, validation failed
- 404: Post not found
- 500: Database error

---

## Technology Stack

### Core Technologies

**Runtime**: Node.js 18+

**Language**: TypeScript 5.x

**HTTP Client**: axios 1.x
- Automatic retry support
- Connection pooling
- Request/response interceptors
- Timeout handling

**Database**: PostgreSQL (primary) / SQLite (fallback)
- Dual database support via dbSelector pattern
- Existing schema supports all requirements

**Logging**: winston 3.x (existing)
- Structured JSON logging
- Multiple transports (console, file)
- Log levels: error, warn, info, debug

### New Dependencies

```json
{
  "dependencies": {
    "axios": "^1.6.0"  // Already installed
  },
  "devDependencies": {
    "@types/node": "^20.0.0"  // Already installed
  }
}
```

**No new npm packages required** - all needed dependencies already present.

### File Structure

```
/workspaces/agent-feed/
├── src/
│   ├── worker/
│   │   ├── claude-code-worker.ts        (MODIFY - add posting)
│   │   └── ...
│   └── utils/
│       ├── agent-feed-api-client.ts     (NEW - HTTP client)
│       ├── outcome-formatter.ts         (NEW - message formatting)
│       ├── outcome-detector.ts          (NEW - post-worthiness logic)
│       └── work-context-extractor.ts    (NEW - context extraction)
├── api-server/
│   └── server.js                        (NO CHANGES - endpoints exist)
└── database/
    └── migrations/
        └── 007_add_outcome_posting.sql  (NEW - optional idempotency)
```

---

## Deployment Considerations

### Configuration Management

**Environment Variables**:
```bash
# Agent Feed API
AGENT_FEED_API_URL=http://localhost:3001/api

# Outcome Posting Feature
ENABLE_OUTCOME_POSTING=true
POSTING_RETRY_ATTEMPTS=3
POSTING_RETRY_DELAY=1000

# Outcome Detection Thresholds
MIN_TOOLS_FOR_POSTING=1
REQUIRE_SUCCESS_FOR_POSTING=true
POST_FAILED_OUTCOMES=false
```

**Runtime Configuration**:
```typescript
// src/worker/claude-code-worker.ts
const config: ClaudeCodeConfig = {
  // ... existing config ...

  enableOutcomePosting: process.env.ENABLE_OUTCOME_POSTING === 'true',
  apiBaseUrl: process.env.AGENT_FEED_API_URL || 'http://localhost:3001/api',
  postingRetryAttempts: parseInt(process.env.POSTING_RETRY_ATTEMPTS || '3'),
  postingRetryDelay: parseInt(process.env.POSTING_RETRY_DELAY || '1000'),
  minToolsForPosting: parseInt(process.env.MIN_TOOLS_FOR_POSTING || '1'),
  requireSuccessForPosting: process.env.REQUIRE_SUCCESS_FOR_POSTING !== 'false',
  postFailedOutcomes: process.env.POST_FAILED_OUTCOMES === 'true',
};
```

### Feature Flag

**Enable/Disable Posting Globally**:
```typescript
// Check feature flag before attempting posting
if (!this.config.enableOutcomePosting) {
  logger.debug('Outcome posting disabled', { ticketId: ticket.id });
  return; // Skip all posting logic
}
```

**Use Cases**:
- Disable during development/testing
- Disable during system maintenance
- Enable only for specific environments
- A/B testing of posting behavior

### Performance Impact

**Expected Overhead**:
- Outcome detection: ~5ms (CPU-bound logic)
- Context extraction: ~2ms (object parsing)
- Message formatting: ~3ms (string operations)
- HTTP request: ~100-500ms (network I/O)
- Database flag update: ~10ms (if using idempotency strategy)

**Total**: ~120-520ms additional latency per post-worthy outcome

**Mitigation**:
- Posting is asynchronous (doesn't block worker return)
- Non-post-worthy outcomes skip HTTP request
- Failed posts don't fail tickets (resilient design)

### Monitoring and Observability

**Metrics to Track**:
```typescript
interface OutcomePostingMetrics {
  // Counts
  totalOutcomes: number;           // All worker completions
  postWorthyOutcomes: number;      // Passed detection filter
  postedOutcomes: number;          // Successfully posted
  failedPostings: number;          // Failed to post
  skippedPostings: number;         // Already posted (idempotency)

  // Rates
  postWorthyRate: number;          // % of outcomes that are post-worthy
  postingSuccessRate: number;      // % of posting attempts that succeed

  // Latency
  avgPostingLatency: number;       // Average HTTP request time
  p95PostingLatency: number;       // 95th percentile latency

  // Errors
  errorsByType: Record<string, number>;  // Error counts by type
}
```

**Logging Strategy**:
```typescript
// Successful posting
logger.info('Outcome posted successfully', {
  ticketId: ticket.id,
  postType: 'reply',
  postedId: 126,
  latency: 234,
});

// Non-post-worthy outcome
logger.debug('Outcome not post-worthy', {
  ticketId: ticket.id,
  reason: 'only routine tools used',
  toolsUsed: ['Read', 'Glob'],
});

// Posting failure
logger.error('Failed to post outcome', {
  ticketId: ticket.id,
  error: error.message,
  willRetry: false,
});
```

### Rollback Plan

**Rollback Steps** (if issues arise):

1. **Disable Feature** (Immediate):
   ```bash
   ENABLE_OUTCOME_POSTING=false
   # Restart workers
   ```

2. **Revert Code** (If needed):
   ```bash
   git revert <commit-hash>
   npm run build
   # Restart system
   ```

3. **Database Rollback** (If schema changed):
   ```sql
   ALTER TABLE work_queue
   DROP COLUMN outcome_posted,
   DROP COLUMN outcome_post_id,
   DROP COLUMN outcome_posted_at;
   ```

**Zero-Downtime Rollback**: Feature flag allows instant disable without code deployment.

### Scalability Considerations

**Current Scale**: 1-10 concurrent workers

**Bottlenecks**:
1. HTTP requests to API (100-500ms each)
2. Database writes for idempotency flag

**Scaling Strategy**:
- HTTP client connection pooling (already enabled)
- Batch database updates (if needed at scale)
- Rate limiting posting to prevent API overload
- Consider message queue for high-volume posting

**At 100 concurrent workers**:
- Expected: 10-50 posts/minute
- HTTP load: Manageable for Express server
- Database load: Minimal (1 extra write per ticket)

---

## Security Considerations

### Authentication (Future)

**Current**: No authentication on posting endpoints (single-user VPS)

**Future**: Add worker authentication
```typescript
class AgentFeedAPIClient {
  constructor(config: APIClientConfig) {
    this.axiosInstance = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'X-Worker-Token': config.workerToken,  // Future: Worker auth
      },
    });
  }
}
```

### Input Sanitization

**Risk**: Malicious content in outcome messages

**Mitigation**:
1. API server already validates input (max lengths, required fields)
2. Outcome content comes from Claude SDK (trusted source)
3. No user-provided content in formatted messages

### Rate Limiting

**Risk**: Worker spam creating posts

**Mitigation**:
```typescript
class ClaudeCodeWorker {
  private postingRateLimiter = {
    maxPostsPerMinute: 10,
    recentPosts: [] as Date[],
  };

  private async postOutcome(...): Promise<void> {
    // Check rate limit
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    this.postingRateLimiter.recentPosts = this.postingRateLimiter.recentPosts
      .filter(d => d > oneMinuteAgo);

    if (this.postingRateLimiter.recentPosts.length >= this.postingRateLimiter.maxPostsPerMinute) {
      logger.warn('Posting rate limit exceeded', { ticketId: ticket.id });
      return; // Skip posting
    }

    // Proceed with posting...
    this.postingRateLimiter.recentPosts.push(now);
  }
}
```

---

## Testing Strategy (Future Reference)

### Unit Tests

**Files to Test**:
1. `outcome-detector.ts` - Classification logic
2. `outcome-formatter.ts` - Message formatting
3. `work-context-extractor.ts` - Context extraction
4. `agent-feed-api-client.ts` - HTTP client (mocked)

**Example**:
```typescript
describe('OutcomeDetector', () => {
  it('should classify Write/Edit as post-worthy', () => {
    const result = {
      success: true,
      output: {
        toolsUsed: ['Read', 'Edit'],
        content: 'Modified file successfully',
      },
      duration: 2000,
    };
    expect(detector.isPostWorthy(result, ticket)).toBe(true);
  });

  it('should filter out Read-only operations', () => {
    const result = {
      success: true,
      output: {
        toolsUsed: ['Read'],
        content: 'File contents: ...',
      },
      duration: 500,
    };
    expect(detector.isPostWorthy(result, ticket)).toBe(false);
  });
});
```

### Integration Tests

**Test Flows**:
1. Comment → Worker → Reply appears on post
2. Post → Worker → Reply appears on post
3. Autonomous → Worker → New post created
4. Failed task → Worker → No post created (default config)
5. Idempotency → Same ticket twice → Only one post

**Example**:
```typescript
describe('Outcome Posting Integration', () => {
  it('should post reply when comment triggers worker', async () => {
    // 1. Create comment via API
    const comment = await api.createComment({
      post_id: 42,
      content: 'Add Dani to file',
    });

    // 2. Wait for worker to process
    await waitForWorkerCompletion(comment.id);

    // 3. Verify reply posted
    const replies = await api.getComments(42);
    const reply = replies.find(c => c.author_agent === 'avi');
    expect(reply).toBeDefined();
    expect(reply.content).toContain('Task completed');
  });
});
```

---

## Summary

### Architecture Highlights

1. **Worker-Level Integration**: Posting logic embedded in ClaudeCodeWorker for maximum context
2. **Zero Server Changes**: Uses existing API endpoints and database schema
3. **Context-Aware**: Automatically determines reply vs new post based on ticket origin
4. **Quality Filtering**: Only posts substantive outcomes (no tool-level noise)
5. **Idempotent**: Database flag prevents duplicate posts
6. **Resilient**: Posting failures don't fail tasks
7. **Configurable**: Feature flags and thresholds for easy tuning
8. **Observable**: Comprehensive logging and metrics

### Implementation Readiness

**Ready for Code Phase**:
- ✅ Component interfaces defined
- ✅ Data flows documented
- ✅ Integration points identified
- ✅ Error handling strategy designed
- ✅ Idempotency approach selected
- ✅ API contracts specified
- ✅ No blocking dependencies

**Next Phase**: Pseudocode / Code Implementation

---

## Appendix: Architecture Diagrams

### Sequence Diagram: Complete Flow

```
User        API         Database    Orchestrator    Worker          API         Feed
 │           │              │             │            │            │            │
 │──Create───│              │             │            │            │            │
 │  Comment  │              │             │            │            │            │
 │           │              │             │            │            │            │
 │           │──Insert──────│             │            │            │            │
 │           │   Comment    │             │            │            │            │
 │           │              │             │            │            │            │
 │           │──Create──────│             │            │            │            │
 │           │   Ticket     │             │            │            │            │
 │           │              │             │            │            │            │
 │           │              │◄──Poll──────│            │            │            │
 │           │              │             │            │            │            │
 │           │              │──Return─────│            │            │            │
 │           │              │   Ticket    │            │            │            │
 │           │              │             │            │            │            │
 │           │              │             │──Spawn─────│            │            │
 │           │              │             │   Worker   │            │            │
 │           │              │             │            │            │            │
 │           │              │             │            │──Execute───│            │
 │           │              │             │            │   Task     │            │
 │           │              │             │            │            │            │
 │           │              │             │            │◄──Result───│            │
 │           │              │             │            │            │            │
 │           │              │             │            │──Detect────│            │
 │           │              │             │            │  Outcome   │            │
 │           │              │             │            │            │            │
 │           │              │             │            │──Format────│            │
 │           │              │             │            │  Message   │            │
 │           │              │             │            │            │            │
 │           │              │             │            │──Post──────│            │
 │           │              │             │            │  Comment   │            │
 │           │              │             │            │            │            │
 │           │              │             │            │            │──Create────│
 │           │              │             │            │            │  Comment   │
 │           │              │             │            │            │            │
 │           │              │             │            │            │◄──Reply────│
 │           │              │             │            │            │            │
 │           │              │             │            │◄──Posted───│            │
 │           │              │             │            │            │            │
 │           │              │             │◄──Return───│            │            │
 │           │              │             │   Result   │            │            │
 │           │              │             │            │            │            │
 │           │              │◄──Update────│            │            │            │
 │           │              │   Ticket    │            │            │            │
 │           │              │  Complete   │            │            │            │
```

---

**End of Architecture Document**
