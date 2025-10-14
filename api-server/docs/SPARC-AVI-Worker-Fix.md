# SPARC Specification: AVI Worker User Post Execution

**Version**: 1.0
**Date**: 2025-10-13
**Status**: Specification Phase
**Project**: AVI Worker Implementation Fix

---

## Executive Summary

**Problem**: The current AgentWorker implementation is designed exclusively for RSS feed processing and fails when users create posts requesting tasks (e.g., "create a file called X.txt with content Y"). The worker expects feed_items that don't exist for user posts, resulting in "Ticket not found or not in assigned state" errors.

**Solution**: Implement a dual-mode execution system that can handle both RSS feed responses and direct user task execution, with proper task parsing, execution, and result reporting.

---

## Phase 1: Specification

### 1.1 Current State Analysis

#### Current Flow (Working for RSS)
```
RSS Feed → feed_items table → work_queue ticket (post_id = feed_item.id)
                              ↓
                     Orchestrator detects ticket
                              ↓
                     Worker spawner creates worker
                              ↓
                     AgentWorker.executeTicket()
                              ↓
                     loadFeedItem(feedItemId) ✓
                              ↓
                     Generate response to feed content ✓
```

#### Current Flow (Failing for User Posts)
```
User Post → posts table → work_queue ticket (post_id = post.id)
                         ↓
                Orchestrator detects ticket ✓
                         ↓
                Worker spawner creates worker ✓
                         ↓
                AgentWorker.executeTicket() ✓
                         ↓
                loadFeedItem(post.id) ✗ FAILS
                         ↓
                Error: "Ticket 492 not found or not in assigned state"
```

#### Root Cause Analysis
1. **Schema Mismatch**: `work_queue.post_id` points to `posts.id` for user posts, but worker tries to load from `feed_items` table
2. **Execution Model**: Worker assumes all work is "generate response to feed content", not "execute user task"
3. **Task Type Detection**: No mechanism to differentiate between feed response vs user task execution
4. **Payload Structure**: Worker payload expects `feedItemId`, but user posts need task instructions

### 1.2 Functional Requirements

#### FR1: Dual-Mode Execution Detection
**Requirement**: Worker must automatically detect whether a ticket is for feed response or user task execution.

**Acceptance Criteria**:
- Worker inspects ticket payload to determine execution mode
- Feed response mode triggers when `payload.feedItemId` exists
- Task execution mode triggers when `payload.taskType` or `payload.taskRequest` exists
- No breaking changes to existing RSS feed processing

**Implementation Notes**:
- Add `ticket.payload.executionMode` field: `"feed_response"` or `"task_execution"`
- Backward compatible: default to `"feed_response"` if not specified

---

#### FR2: Task Request Parsing
**Requirement**: Extract actionable task information from user post content.

**Acceptance Criteria**:
- Parse natural language task requests from post content
- Identify task type: `file_creation`, `file_modification`, `file_deletion`, `system_command`, `analysis`, `research`
- Extract task parameters (file paths, content, commands)
- Handle ambiguous requests gracefully with clarification responses

**Task Types Supported**:
| Task Type | Example Request | Parameters |
|-----------|----------------|------------|
| `file_creation` | "Create file X.txt with content Y" | `path`, `content` |
| `file_modification` | "Update X.txt to add line Y" | `path`, `content`, `mode` |
| `file_deletion` | "Delete file X.txt" | `path` |
| `directory_operation` | "Create directory /workspace/new" | `path`, `operation` |
| `system_info` | "What files are in /workspace?" | `query` |
| `analysis` | "Analyze this code for issues" | `content`, `analysisType` |

---

#### FR3: Task Execution Engine
**Requirement**: Execute parsed tasks using appropriate system tools.

**Acceptance Criteria**:
- File operations executed via Node.js `fs` module
- Operations restricted to `/workspaces/agent-feed/prod/agent_workspace/` directory
- Proper error handling for permission denied, file not found, etc.
- Execution results captured and returned to user

**Security Constraints**:
- Path traversal protection (no `../` escapes)
- Whitelist of allowed directories
- File size limits (max 10MB per file)
- Forbidden operations: system-level changes, network operations outside API

---

#### FR4: Result Reporting
**Requirement**: Return execution results to user in structured format.

**Acceptance Criteria**:
- Success responses include: operation performed, file path, content preview
- Failure responses include: error type, error message, suggested fixes
- Results stored in `agent_responses` table
- User can see task status and results in feed

**Response Format**:
```json
{
  "success": true,
  "taskType": "file_creation",
  "operation": "Created file X.txt",
  "details": {
    "path": "/workspaces/agent-feed/prod/agent_workspace/X.txt",
    "size": 1024,
    "preview": "First 200 chars of content..."
  },
  "timestamp": "2025-10-13T12:00:00Z"
}
```

---

#### FR5: Error Handling and Recovery
**Requirement**: Graceful handling of all error conditions.

**Acceptance Criteria**:
- File system errors (permission denied, disk full) handled gracefully
- Invalid task requests result in helpful error messages
- Worker failures don't crash orchestrator
- Failed tickets can be retried with exponential backoff

**Error Categories**:
- `PARSE_ERROR`: Cannot understand user request
- `VALIDATION_ERROR`: Request understood but invalid parameters
- `EXECUTION_ERROR`: Task failed during execution
- `PERMISSION_ERROR`: Operation not allowed
- `SYSTEM_ERROR`: Unexpected system failure

---

#### FR6: Work Queue Integration
**Requirement**: Seamless integration with existing work queue system.

**Acceptance Criteria**:
- Tickets created with proper `executionMode` field
- Post creation endpoint adds task metadata to `post_metadata`
- Orchestrator processes both types of tickets identically
- Queue statistics include task execution metrics

**Ticket Schema Enhancement**:
```typescript
interface WorkQueueTicket {
  // Existing fields...
  post_metadata: {
    executionMode?: "feed_response" | "task_execution";
    taskRequest?: {
      type: string;
      parameters: Record<string, any>;
      rawRequest: string;
    };
  };
}
```

---

#### FR7: Task Type Detection and Classification
**Requirement**: Intelligent classification of user requests into task types.

**Acceptance Criteria**:
- Pattern matching for common task keywords
- LLM-based classification for ambiguous requests
- Default to `analysis` type when unclear
- Confidence scores for classification decisions

**Pattern Examples**:
- `/create|make|write.*file/i` → `file_creation`
- `/update|modify|edit.*file/i` → `file_modification`
- `/delete|remove.*file/i` → `file_deletion`
- `/list|show|what.*files/i` → `system_info`

---

#### FR8: Workspace Isolation and Security
**Requirement**: All file operations isolated to designated workspace.

**Acceptance Criteria**:
- Base directory: `/workspaces/agent-feed/prod/agent_workspace/`
- Path validation before any operation
- Reject absolute paths outside workspace
- Reject relative paths with `../` traversal
- Each user gets isolated subdirectory (optional future enhancement)

**Security Rules**:
```typescript
const ALLOWED_BASE = '/workspaces/agent-feed/prod/agent_workspace/';
const FORBIDDEN_PATTERNS = ['../', '~/', '/etc/', '/var/', '/usr/'];
```

---

#### FR9: Monitoring and Metrics
**Requirement**: Track task execution metrics for observability.

**Acceptance Criteria**:
- Task execution duration tracked
- Success/failure rates per task type
- Error frequency by category
- Metrics exposed via monitoring endpoint

**Metrics to Track**:
- `task_executions_total` (counter by type)
- `task_execution_duration_ms` (histogram)
- `task_errors_total` (counter by error type)
- `active_task_executions` (gauge)

---

#### FR10: Backward Compatibility
**Requirement**: Existing RSS feed processing continues to work.

**Acceptance Criteria**:
- No changes to feed monitor or feed processing
- Existing tickets without `executionMode` default to feed response
- All existing tests pass without modification
- Zero downtime deployment possible

---

### 1.3 Non-Functional Requirements

#### NFR1: Performance
- Task execution completes within 30 seconds (95th percentile)
- No more than 10MB memory overhead per task
- Support 10 concurrent task executions

#### NFR2: Reliability
- 99% success rate for valid task requests
- Automatic retry for transient failures (max 3 attempts)
- Graceful degradation when file system unavailable

#### NFR3: Security
- All operations sandboxed to workspace directory
- No shell command injection vulnerabilities
- Input sanitization for all user-provided content
- Audit log for all file operations

#### NFR4: Maintainability
- Clear separation between feed response and task execution code
- Comprehensive unit test coverage (>80%)
- Integration tests for all task types
- Documentation for adding new task types

---

## Phase 2: Pseudocode

### 2.1 Main Worker Execution Flow

```typescript
// AgentWorker.executeTicket() - Enhanced Version

async executeTicket(ticket: WorkTicket): Promise<WorkerResult> {
  startTime = now()

  try {
    // STEP 1: Determine execution mode
    executionMode = detectExecutionMode(ticket)

    if (executionMode === "feed_response") {
      // EXISTING LOGIC - No changes
      return await executeFeedResponse(ticket)
    }
    else if (executionMode === "task_execution") {
      // NEW LOGIC - Task execution
      return await executeUserTask(ticket)
    }
    else {
      throw Error("Unknown execution mode")
    }
  }
  catch (error) {
    duration = now() - startTime
    await storeFailedResponse(ticket, error)
    return {
      success: false,
      error: error,
      tokensUsed: 0,
      duration: duration
    }
  }
}
```

---

### 2.2 Execution Mode Detection

```typescript
function detectExecutionMode(ticket: WorkTicket): ExecutionMode {
  // Check explicit executionMode in metadata
  if (ticket.payload.metadata?.executionMode) {
    return ticket.payload.metadata.executionMode
  }

  // Check for feedItemId (legacy indicator)
  if (ticket.payload.feedItemId) {
    return "feed_response"
  }

  // Check for task indicators in post content
  if (ticket.payload.content) {
    if (containsTaskKeywords(ticket.payload.content)) {
      return "task_execution"
    }
  }

  // Check if post_id points to feed_items or posts table
  sourceTable = detectSourceTable(ticket.payload.post_id)
  if (sourceTable === "feed_items") {
    return "feed_response"
  }
  else if (sourceTable === "posts") {
    return "task_execution"
  }

  // Default to feed_response for backward compatibility
  return "feed_response"
}

function containsTaskKeywords(content: string): boolean {
  taskPatterns = [
    /create.*file/i,
    /make.*file/i,
    /write.*file/i,
    /delete.*file/i,
    /update.*file/i,
    /modify.*file/i,
    /list.*files/i,
    /show.*directory/i
  ]

  return taskPatterns.some(pattern => pattern.test(content))
}

async function detectSourceTable(postId: string): Promise<string> {
  // Query feed_items first
  feedItem = await db.query("SELECT id FROM feed_items WHERE id = $1", [postId])
  if (feedItem.rows.length > 0) {
    return "feed_items"
  }

  // Query posts second
  post = await db.query("SELECT id FROM posts WHERE id = $1", [postId])
  if (post.rows.length > 0) {
    return "posts"
  }

  return "unknown"
}
```

---

### 2.3 User Task Execution

```typescript
async function executeUserTask(ticket: WorkTicket): Promise<WorkerResult> {
  // STEP 1: Load post content
  post = await loadPost(ticket.payload.post_id)
  if (!post) {
    throw Error("Post not found")
  }

  // STEP 2: Parse task from content
  taskRequest = await parseTaskRequest(post.content)
  if (!taskRequest.valid) {
    return createParseErrorResponse(taskRequest.error)
  }

  // STEP 3: Validate task
  validation = validateTask(taskRequest)
  if (!validation.valid) {
    return createValidationErrorResponse(validation.errors)
  }

  // STEP 4: Execute task
  executor = TaskExecutorFactory.create(taskRequest.type)
  result = await executor.execute(taskRequest.parameters)

  // STEP 5: Store result
  responseId = await storeTaskResponse(ticket, post, result)

  // STEP 6: Return result
  return {
    success: true,
    output: {
      responseId: responseId,
      taskType: taskRequest.type,
      result: result
    },
    tokensUsed: 0, // No LLM for simple tasks
    duration: result.duration
  }
}
```

---

### 2.4 Task Parsing

```typescript
interface TaskRequest {
  valid: boolean;
  type: TaskType;
  parameters: Record<string, any>;
  rawRequest: string;
  confidence: number;
  error?: string;
}

async function parseTaskRequest(content: string): Promise<TaskRequest> {
  // STEP 1: Try pattern-based parsing first (fast)
  for (pattern of TASK_PATTERNS) {
    match = pattern.regex.exec(content)
    if (match) {
      return {
        valid: true,
        type: pattern.type,
        parameters: extractParameters(match, pattern.parameterMap),
        rawRequest: content,
        confidence: 0.95
      }
    }
  }

  // STEP 2: Use LLM for complex/ambiguous requests
  llmParse = await llmTaskParser.parse(content)
  return {
    valid: llmParse.success,
    type: llmParse.taskType,
    parameters: llmParse.parameters,
    rawRequest: content,
    confidence: llmParse.confidence,
    error: llmParse.error
  }
}

// Pattern-based task detection
const TASK_PATTERNS = [
  {
    type: "file_creation",
    regex: /create\s+(?:a\s+)?file\s+(?:called\s+)?([^\s]+)\s+with\s+content\s+(.+)/i,
    parameterMap: {
      1: "filename",
      2: "content"
    }
  },
  {
    type: "file_deletion",
    regex: /delete\s+(?:the\s+)?file\s+([^\s]+)/i,
    parameterMap: {
      1: "filename"
    }
  },
  {
    type: "directory_listing",
    regex: /(?:list|show|what).*files\s+in\s+([^\s]+)/i,
    parameterMap: {
      1: "directory"
    }
  }
  // Add more patterns...
]
```

---

### 2.5 Task Execution

```typescript
interface TaskExecutor {
  execute(parameters: Record<string, any>): Promise<TaskResult>;
}

class FileCreationExecutor implements TaskExecutor {
  async execute(params: {filename: string, content: string}): Promise<TaskResult> {
    startTime = now()

    // STEP 1: Validate and sanitize path
    sanitizedPath = sanitizePath(params.filename)
    fullPath = path.join(WORKSPACE_BASE, sanitizedPath)

    if (!isPathSafe(fullPath)) {
      throw Error("Path validation failed: " + fullPath)
    }

    // STEP 2: Check if file already exists
    if (fs.existsSync(fullPath)) {
      throw Error("File already exists: " + sanitizedPath)
    }

    // STEP 3: Ensure directory exists
    directory = path.dirname(fullPath)
    await fs.promises.mkdir(directory, {recursive: true})

    // STEP 4: Write file
    await fs.promises.writeFile(fullPath, params.content, 'utf8')

    // STEP 5: Verify creation
    stats = await fs.promises.stat(fullPath)

    duration = now() - startTime

    return {
      success: true,
      operation: "file_creation",
      details: {
        path: fullPath,
        size: stats.size,
        preview: params.content.substring(0, 200)
      },
      duration: duration
    }
  }
}

class FileModificationExecutor implements TaskExecutor {
  async execute(params: {filename: string, content: string, mode: string}): Promise<TaskResult> {
    sanitizedPath = sanitizePath(params.filename)
    fullPath = path.join(WORKSPACE_BASE, sanitizedPath)

    if (!isPathSafe(fullPath)) {
      throw Error("Path validation failed")
    }

    if (!fs.existsSync(fullPath)) {
      throw Error("File not found: " + sanitizedPath)
    }

    if (params.mode === "append") {
      await fs.promises.appendFile(fullPath, params.content, 'utf8')
    }
    else if (params.mode === "replace") {
      await fs.promises.writeFile(fullPath, params.content, 'utf8')
    }
    else {
      throw Error("Unknown modification mode: " + params.mode)
    }

    stats = await fs.promises.stat(fullPath)

    return {
      success: true,
      operation: "file_modification",
      details: {
        path: fullPath,
        size: stats.size,
        mode: params.mode
      }
    }
  }
}

class FileDeletionExecutor implements TaskExecutor {
  async execute(params: {filename: string}): Promise<TaskResult> {
    sanitizedPath = sanitizePath(params.filename)
    fullPath = path.join(WORKSPACE_BASE, sanitizedPath)

    if (!isPathSafe(fullPath)) {
      throw Error("Path validation failed")
    }

    if (!fs.existsSync(fullPath)) {
      throw Error("File not found: " + sanitizedPath)
    }

    await fs.promises.unlink(fullPath)

    return {
      success: true,
      operation: "file_deletion",
      details: {
        path: fullPath
      }
    }
  }
}

class DirectoryListingExecutor implements TaskExecutor {
  async execute(params: {directory: string}): Promise<TaskResult> {
    sanitizedPath = sanitizePath(params.directory || '.')
    fullPath = path.join(WORKSPACE_BASE, sanitizedPath)

    if (!isPathSafe(fullPath)) {
      throw Error("Path validation failed")
    }

    if (!fs.existsSync(fullPath)) {
      throw Error("Directory not found: " + sanitizedPath)
    }

    files = await fs.promises.readdir(fullPath, {withFileTypes: true})

    fileList = files.map(file => ({
      name: file.name,
      type: file.isDirectory() ? 'directory' : 'file',
      path: path.join(sanitizedPath, file.name)
    }))

    return {
      success: true,
      operation: "directory_listing",
      details: {
        directory: fullPath,
        files: fileList,
        count: fileList.length
      }
    }
  }
}
```

---

### 2.6 Path Security Validation

```typescript
const WORKSPACE_BASE = '/workspaces/agent-feed/prod/agent_workspace/';
const FORBIDDEN_PATTERNS = ['../', '~/', '/etc/', '/var/', '/usr/', '/root/'];

function sanitizePath(userPath: string): string {
  // Remove leading/trailing whitespace
  cleaned = userPath.trim()

  // Remove any absolute path prefix
  if (cleaned.startsWith('/')) {
    cleaned = cleaned.substring(1)
  }

  // Normalize path (remove redundant separators)
  cleaned = path.normalize(cleaned)

  return cleaned
}

function isPathSafe(fullPath: string): boolean {
  // RULE 1: Must start with workspace base
  if (!fullPath.startsWith(WORKSPACE_BASE)) {
    return false
  }

  // RULE 2: Resolve path and check it's still inside workspace
  resolved = path.resolve(fullPath)
  if (!resolved.startsWith(path.resolve(WORKSPACE_BASE))) {
    return false
  }

  // RULE 3: Check for forbidden patterns
  for (pattern of FORBIDDEN_PATTERNS) {
    if (fullPath.includes(pattern)) {
      return false
    }
  }

  // RULE 4: Ensure no null bytes (path injection)
  if (fullPath.includes('\0')) {
    return false
  }

  return true
}
```

---

### 2.7 Task Executor Factory

```typescript
class TaskExecutorFactory {
  static create(taskType: TaskType): TaskExecutor {
    switch (taskType) {
      case "file_creation":
        return new FileCreationExecutor()
      case "file_modification":
        return new FileModificationExecutor()
      case "file_deletion":
        return new FileDeletionExecutor()
      case "directory_listing":
        return new DirectoryListingExecutor()
      case "system_info":
        return new SystemInfoExecutor()
      default:
        throw Error("Unknown task type: " + taskType)
    }
  }
}
```

---

## Phase 3: Architecture

### 3.1 Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User / External System                    │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
            ┌──────────────────────┐
            │   POST /api/posts    │
            │  (User creates post  │
            │   with task request) │
            └──────────┬───────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │   Posts Table        │
            │   (stores post)      │
            └──────────┬───────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │  Work Queue Table    │
            │  (creates ticket)    │
            └──────────┬───────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │   AVI Orchestrator   │
            │  (polls for tickets) │
            └──────────┬───────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │  Worker Spawner      │
            │  (creates worker)    │
            └──────────┬───────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                      AgentWorker                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  executeTicket()                                        │  │
│  │    ├─ detectExecutionMode()                            │  │
│  │    │    ├─ "feed_response" → executeFeedResponse()    │  │
│  │    │    └─ "task_execution" → executeUserTask()       │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  executeUserTask()                                      │  │
│  │    ├─ loadPost()                                        │  │
│  │    ├─ parseTaskRequest()                               │  │
│  │    ├─ validateTask()                                   │  │
│  │    ├─ TaskExecutorFactory.create()                     │  │
│  │    └─ executor.execute()                               │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  TaskExecutor Implementations                           │  │
│  │    ├─ FileCreationExecutor                             │  │
│  │    ├─ FileModificationExecutor                         │  │
│  │    ├─ FileDeletionExecutor                             │  │
│  │    ├─ DirectoryListingExecutor                         │  │
│  │    └─ SystemInfoExecutor                               │  │
│  └────────────────────────────────────────────────────────┘  │
└───────────────────────────┬───────────────────────────────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │  Agent Responses Table│
                │  (stores task result) │
                └───────────────────────┘
```

---

### 3.2 Class Diagram

```typescript
// Core Worker Classes

class AgentWorker {
  - db: DatabaseManager
  - responseGenerator: ResponseGenerator
  - memoryUpdater: MemoryUpdater
  - taskExecutorFactory: TaskExecutorFactory
  - taskParser: TaskParser

  + executeTicket(ticket: WorkTicket): Promise<WorkerResult>
  - detectExecutionMode(ticket: WorkTicket): ExecutionMode
  - executeFeedResponse(ticket: WorkTicket): Promise<WorkerResult>
  - executeUserTask(ticket: WorkTicket): Promise<WorkerResult>
  - loadPost(postId: string): Promise<Post>
  - storeTaskResponse(ticket, post, result): Promise<string>
}

class TaskParser {
  - patterns: TaskPattern[]
  - llmParser: LLMTaskParser

  + parse(content: string): Promise<TaskRequest>
  - tryPatternMatch(content: string): TaskRequest | null
  - tryLLMParse(content: string): Promise<TaskRequest>
}

interface TaskExecutor {
  + execute(parameters: Record<string, any>): Promise<TaskResult>
}

class FileCreationExecutor implements TaskExecutor {
  + execute(params: {filename, content}): Promise<TaskResult>
}

class FileModificationExecutor implements TaskExecutor {
  + execute(params: {filename, content, mode}): Promise<TaskResult>
}

class FileDeletionExecutor implements TaskExecutor {
  + execute(params: {filename}): Promise<TaskResult>
}

class DirectoryListingExecutor implements TaskExecutor {
  + execute(params: {directory}): Promise<TaskResult>
}

class TaskExecutorFactory {
  + static create(taskType: TaskType): TaskExecutor
  + static registerExecutor(type: string, executor: TaskExecutor): void
}

class PathValidator {
  + static sanitizePath(userPath: string): string
  + static isPathSafe(fullPath: string): boolean
  + static resolveWorkspacePath(relativePath: string): string
}
```

---

### 3.3 Database Schema Enhancements

#### 3.3.1 Existing Tables (No Changes)
```sql
-- posts table (unchanged)
CREATE TABLE posts (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_agent TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  published_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- work_queue table (unchanged structure, enhanced metadata usage)
CREATE TABLE work_queue (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'anonymous',
  post_id UUID NOT NULL,
  post_content TEXT,
  post_author TEXT,
  post_metadata JSONB DEFAULT '{}', -- Will contain executionMode
  assigned_agent TEXT,
  priority INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  worker_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  assigned_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  result JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0
);
```

#### 3.3.2 Enhanced Metadata Schemas

```typescript
// post_metadata schema for task execution posts
interface TaskPostMetadata {
  executionMode: "task_execution";
  taskRequest?: {
    type: TaskType;
    parameters: Record<string, any>;
    rawRequest: string;
    confidence?: number;
  };
  isAgentResponse?: boolean;
  businessImpact?: number;
  tags?: string[];
}

// work_queue.post_metadata schema
interface WorkQueueMetadata {
  executionMode: "feed_response" | "task_execution";
  taskRequest?: {
    type: TaskType;
    parameters: Record<string, any>;
    rawRequest: string;
  };
  sourceTable: "posts" | "feed_items";
}

// agent_responses.response_metadata schema for task results
interface TaskResponseMetadata {
  taskType: TaskType;
  executionDuration: number;
  filesAffected?: string[];
  operationDetails: Record<string, any>;
}
```

---

### 3.4 Data Flow Diagrams

#### 3.4.1 User Task Request Flow

```
┌─────────┐
│  USER   │ "Create file X.txt with content Y"
└────┬────┘
     │
     ▼
┌─────────────────────────────────────────────────┐
│ POST /api/v1/posts                              │
│ {                                               │
│   title: "Task Request",                        │
│   content: "Create file X.txt with content Y",  │
│   authorAgent: "user",                          │
│   metadata: {                                   │
│     executionMode: "task_execution"             │
│   }                                             │
│ }                                               │
└────┬────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────┐
│ DatabaseService.createPost()                    │
│ → INSERT INTO posts (...)                       │
│ → Returns post.id                               │
└────┬────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────┐
│ WorkQueueRepository.createTicket()              │
│ → INSERT INTO work_queue (                      │
│     post_id = post.id,                          │
│     post_content = "Create file...",            │
│     post_metadata = {                           │
│       executionMode: "task_execution"           │
│     }                                           │
│   )                                             │
└────┬────────────────────────────────────────────┘
     │
     ▼ (Orchestrator polls every 5s)
┌─────────────────────────────────────────────────┐
│ AviOrchestrator.processTickets()                │
│ → getPendingTickets()                           │
│ → Found ticket #492                             │
└────┬────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────┐
│ WorkerSpawner.spawnWorker(ticket)               │
│ → Creates AgentWorker instance                  │
│ → assignTicket(#492, worker-123)                │
└────┬────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────┐
│ AgentWorker.executeTicket(ticket #492)          │
│                                                 │
│ 1. detectExecutionMode()                        │
│    → Checks post_metadata.executionMode         │
│    → Returns "task_execution"                   │
│                                                 │
│ 2. executeUserTask()                            │
│    a. loadPost(post.id)                         │
│       → SELECT * FROM posts WHERE id = post.id  │
│    b. parseTaskRequest(post.content)            │
│       → Type: "file_creation"                   │
│       → Params: {filename: "X.txt", content: "Y"}│
│    c. validateTask()                            │
│       → Path check: ✓                           │
│       → Permissions: ✓                          │
│    d. TaskExecutorFactory.create("file_creation")│
│       → Returns FileCreationExecutor            │
│    e. executor.execute(params)                  │
│       → fs.writeFile("/workspace/X.txt", "Y")   │
│       → Returns TaskResult                      │
│    f. storeTaskResponse()                       │
│       → INSERT INTO agent_responses (...)       │
│                                                 │
│ 3. Return WorkerResult                          │
│    → success: true                              │
│    → output: {taskType, result}                 │
└────┬────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────┐
│ WorkerSpawner.executeWorker() (continued)       │
│ → completeTicket(#492, result)                  │
│ → UPDATE work_queue SET status = 'completed'    │
└────┬────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────┐
│ User sees result in feed                        │
│ "✓ Created file X.txt (1024 bytes)"            │
└─────────────────────────────────────────────────┘
```

---

### 3.5 Error Handling Flow

```
┌───────────────────────────────┐
│ AgentWorker.executeUserTask() │
└───────────┬───────────────────┘
            │
            ▼
    ┌───────────────┐
    │ parseTask()   │
    └───┬───────────┘
        │
        ├─ Success ─────────────────┐
        │                           │
        └─ Failure ─────────────────┤
           │                        │
           ▼                        ▼
    ┌──────────────┐      ┌────────────────┐
    │ PARSE_ERROR  │      │ validateTask() │
    │ Return help  │      └────┬───────────┘
    │ message to   │           │
    │ user         │           ├─ Success ──────┐
    └──────────────┘           │                │
                               └─ Failure ───────┤
                                  │              │
                                  ▼              ▼
                           ┌──────────────┐   ┌──────────┐
                           │VALIDATION_ERR│   │ execute()│
                           │Explain issue │   └────┬─────┘
                           └──────────────┘        │
                                                   ├─ Success ─┐
                                                   │           │
                                                   └─ Failure ──┤
                                                      │         │
                                                      ▼         ▼
                                               ┌──────────┐  ┌────┐
                                               │EXECUTION │  │ OK │
                                               │ERROR     │  └────┘
                                               │Log+Report│
                                               └──────────┘
```

---

## Phase 4: Refinement

### 4.1 Implementation Plan

#### Phase 4.1: Core Infrastructure (Week 1)
**Deliverables**:
1. Create `/src/worker/task-execution/` directory structure
2. Implement `ExecutionModeDetector` class
3. Implement `PathValidator` utility
4. Add unit tests for path validation (15+ test cases)

**Files to Create**:
- `/src/worker/task-execution/execution-mode-detector.ts`
- `/src/worker/task-execution/path-validator.ts`
- `/src/worker/task-execution/types.ts`
- `/tests/unit/task-execution/path-validator.test.ts`

---

#### Phase 4.2: Task Parsing (Week 1-2)
**Deliverables**:
1. Implement `TaskParser` class
2. Define pattern-based task detection rules
3. Implement fallback to LLM parsing
4. Add unit tests for task parsing (20+ test cases)

**Files to Create**:
- `/src/worker/task-execution/task-parser.ts`
- `/src/worker/task-execution/task-patterns.ts`
- `/tests/unit/task-execution/task-parser.test.ts`

**Test Cases**:
- "Create file X.txt with content Y" → file_creation
- "Delete file X.txt" → file_deletion
- "Update X.txt to add line Y" → file_modification
- "List files in /workspace/" → directory_listing
- Ambiguous: "Help me with X.txt" → LLM parsing

---

#### Phase 4.3: Task Executors (Week 2)
**Deliverables**:
1. Implement `TaskExecutor` interface
2. Implement `FileCreationExecutor`
3. Implement `FileModificationExecutor`
4. Implement `FileDeletionExecutor`
5. Implement `DirectoryListingExecutor`
6. Implement `TaskExecutorFactory`
7. Add unit tests for each executor (10+ tests each)

**Files to Create**:
- `/src/worker/task-execution/executors/task-executor.interface.ts`
- `/src/worker/task-execution/executors/file-creation.executor.ts`
- `/src/worker/task-execution/executors/file-modification.executor.ts`
- `/src/worker/task-execution/executors/file-deletion.executor.ts`
- `/src/worker/task-execution/executors/directory-listing.executor.ts`
- `/src/worker/task-execution/executors/factory.ts`
- `/tests/unit/task-execution/executors/*.test.ts`

---

#### Phase 4.4: Worker Integration (Week 3)
**Deliverables**:
1. Modify `AgentWorker.executeTicket()` to detect execution mode
2. Implement `AgentWorker.executeUserTask()` method
3. Implement `AgentWorker.loadPost()` method
4. Update `WorkerSpawnerAdapter.loadWorkTicket()` to preserve metadata
5. Add integration tests

**Files to Modify**:
- `/src/worker/agent-worker.ts`
- `/src/adapters/worker-spawner.adapter.ts`

**Files to Create**:
- `/tests/integration/task-execution/user-task-flow.test.ts`

---

#### Phase 4.5: Post Creation Enhancement (Week 3)
**Deliverables**:
1. Update POST /api/v1/posts to detect task requests
2. Automatically set `executionMode` in metadata
3. Create work queue ticket with proper metadata
4. Add API tests

**Files to Modify**:
- `/src/api/routes/posts.ts`

**Files to Create**:
- `/tests/integration/api/task-post-creation.test.ts`

---

#### Phase 4.6: Testing and Validation (Week 4)
**Deliverables**:
1. End-to-end tests for complete flow
2. Security testing (path traversal, injection)
3. Performance testing (concurrent tasks)
4. Error handling tests
5. Backward compatibility tests

**Files to Create**:
- `/tests/e2e/task-execution/complete-flow.test.ts`
- `/tests/security/task-execution/path-security.test.ts`
- `/tests/performance/task-execution/concurrent-tasks.test.ts`

---

### 4.2 Test Strategy

#### 4.2.1 Unit Tests (Coverage Target: 90%)

**PathValidator Tests**:
```typescript
describe('PathValidator', () => {
  test('sanitizePath removes leading slash', () => {
    expect(PathValidator.sanitizePath('/test.txt')).toBe('test.txt');
  });

  test('sanitizePath preserves valid relative path', () => {
    expect(PathValidator.sanitizePath('dir/test.txt')).toBe('dir/test.txt');
  });

  test('isPathSafe rejects parent directory traversal', () => {
    const malicious = '/workspaces/agent-feed/prod/agent_workspace/../secret.txt';
    expect(PathValidator.isPathSafe(malicious)).toBe(false);
  });

  test('isPathSafe rejects paths outside workspace', () => {
    const outside = '/etc/passwd';
    expect(PathValidator.isPathSafe(outside)).toBe(false);
  });

  test('isPathSafe accepts valid workspace path', () => {
    const valid = '/workspaces/agent-feed/prod/agent_workspace/test.txt';
    expect(PathValidator.isPathSafe(valid)).toBe(true);
  });

  // Add 10+ more security test cases...
});
```

**TaskParser Tests**:
```typescript
describe('TaskParser', () => {
  test('parses file creation request', async () => {
    const result = await parser.parse('Create file test.txt with content Hello');
    expect(result.type).toBe('file_creation');
    expect(result.parameters.filename).toBe('test.txt');
    expect(result.parameters.content).toBe('Hello');
  });

  test('parses file deletion request', async () => {
    const result = await parser.parse('Delete file test.txt');
    expect(result.type).toBe('file_deletion');
    expect(result.parameters.filename).toBe('test.txt');
  });

  test('falls back to LLM for ambiguous request', async () => {
    const result = await parser.parse('Can you help me with my file?');
    expect(result.confidence).toBeLessThan(0.8);
  });

  // Add 15+ more parsing test cases...
});
```

**FileCreationExecutor Tests**:
```typescript
describe('FileCreationExecutor', () => {
  let executor: FileCreationExecutor;
  let testDir: string;

  beforeEach(() => {
    executor = new FileCreationExecutor();
    testDir = '/workspaces/agent-feed/prod/agent_workspace/test-' + Date.now();
    fs.mkdirSync(testDir, {recursive: true});
  });

  afterEach(() => {
    fs.rmSync(testDir, {recursive: true, force: true});
  });

  test('creates file with content', async () => {
    const result = await executor.execute({
      filename: path.join(testDir, 'test.txt'),
      content: 'Hello World'
    });

    expect(result.success).toBe(true);
    expect(fs.existsSync(path.join(testDir, 'test.txt'))).toBe(true);

    const content = fs.readFileSync(path.join(testDir, 'test.txt'), 'utf8');
    expect(content).toBe('Hello World');
  });

  test('fails if file already exists', async () => {
    fs.writeFileSync(path.join(testDir, 'existing.txt'), 'content');

    await expect(executor.execute({
      filename: path.join(testDir, 'existing.txt'),
      content: 'new content'
    })).rejects.toThrow('File already exists');
  });

  test('creates nested directories automatically', async () => {
    const result = await executor.execute({
      filename: path.join(testDir, 'a/b/c/test.txt'),
      content: 'nested'
    });

    expect(result.success).toBe(true);
    expect(fs.existsSync(path.join(testDir, 'a/b/c/test.txt'))).toBe(true);
  });

  // Add 7+ more executor test cases...
});
```

---

#### 4.2.2 Integration Tests

```typescript
describe('Task Execution Integration', () => {
  let db: DatabaseManager;
  let worker: AgentWorker;

  beforeAll(async () => {
    db = await setupTestDatabase();
    worker = new AgentWorker(db);
  });

  test('complete user task flow: post → ticket → execution → response', async () => {
    // 1. Create post with task request
    const post = await db.query(`
      INSERT INTO posts (id, title, content, author_agent, metadata)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      uuidv4(),
      'Task Request',
      'Create file test.txt with content Hello',
      'user',
      JSON.stringify({executionMode: 'task_execution'})
    ]);

    // 2. Create work queue ticket
    const ticket = await workQueue.createTicket({
      post_id: post.rows[0].id,
      post_content: post.rows[0].content,
      post_metadata: post.rows[0].metadata
    });

    // 3. Execute ticket
    const result = await worker.executeTicket({
      id: ticket.id.toString(),
      type: 'post_response',
      priority: 0,
      agentName: 'avi',
      userId: 'test-user',
      payload: {
        post_id: post.rows[0].id,
        content: post.rows[0].content,
        metadata: post.rows[0].metadata
      },
      createdAt: new Date(),
      status: 'processing'
    });

    // 4. Verify result
    expect(result.success).toBe(true);
    expect(result.output.taskType).toBe('file_creation');

    // 5. Verify file was created
    const filePath = '/workspaces/agent-feed/prod/agent_workspace/test.txt';
    expect(fs.existsSync(filePath)).toBe(true);

    // 6. Verify response stored in database
    const responses = await db.query(`
      SELECT * FROM agent_responses WHERE work_ticket_id = $1
    `, [ticket.id]);

    expect(responses.rows.length).toBe(1);
    expect(responses.rows[0].status).toBe('validated');
  });

  // Add 5+ more integration test scenarios...
});
```

---

#### 4.2.3 End-to-End Tests

```typescript
describe('E2E: User Task Execution', () => {
  test('user creates post with task, system executes, user sees result', async () => {
    // 1. User creates post via API
    const response = await fetch('http://localhost:3000/api/v1/posts', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        title: 'Create Test File',
        content: 'Create file my-test.txt with content "E2E Test"',
        authorAgent: 'user',
        metadata: {executionMode: 'task_execution'}
      })
    });

    const {data: post} = await response.json();
    expect(post.id).toBeDefined();

    // 2. Wait for orchestrator to process (max 30s)
    let completed = false;
    for (let i = 0; i < 30 && !completed; i++) {
      await sleep(1000);

      const ticketStatus = await fetch(
        `http://localhost:3000/api/v1/work-queue/tickets?post_id=${post.id}`
      );
      const {data: tickets} = await ticketStatus.json();

      if (tickets.length > 0 && tickets[0].status === 'completed') {
        completed = true;
      }
    }

    expect(completed).toBe(true);

    // 3. Verify file was created
    const filePath = '/workspaces/agent-feed/prod/agent_workspace/my-test.txt';
    expect(fs.existsSync(filePath)).toBe(true);

    const content = fs.readFileSync(filePath, 'utf8');
    expect(content).toBe('E2E Test');

    // 4. Verify user can see result in feed
    const feedResponse = await fetch('http://localhost:3000/api/v1/posts');
    const {data: posts} = await feedResponse.json();

    const resultPost = posts.find(p => p.id === post.id);
    expect(resultPost).toBeDefined();
  });
});
```

---

#### 4.2.4 Security Tests

```typescript
describe('Security: Path Traversal Prevention', () => {
  test('rejects path traversal with ../../../', async () => {
    const executor = new FileCreationExecutor();

    await expect(executor.execute({
      filename: '../../../etc/passwd',
      content: 'hacked'
    })).rejects.toThrow('Path validation failed');
  });

  test('rejects absolute paths outside workspace', async () => {
    const executor = new FileCreationExecutor();

    await expect(executor.execute({
      filename: '/etc/passwd',
      content: 'hacked'
    })).rejects.toThrow('Path validation failed');
  });

  test('rejects symlink to outside workspace', async () => {
    // Create symlink in test workspace pointing outside
    const testDir = '/workspaces/agent-feed/prod/agent_workspace/test-symlink';
    fs.mkdirSync(testDir, {recursive: true});
    fs.symlinkSync('/etc', path.join(testDir, 'link'));

    const executor = new FileCreationExecutor();

    await expect(executor.execute({
      filename: path.join(testDir, 'link/passwd'),
      content: 'hacked'
    })).rejects.toThrow('Path validation failed');

    fs.rmSync(testDir, {recursive: true, force: true});
  });

  // Add 10+ more security test cases...
});
```

---

### 4.3 Performance Considerations

#### 4.3.1 Optimization Targets
- **Task Parsing**: < 100ms (pattern matching), < 2s (LLM fallback)
- **File Operations**: < 500ms for files < 1MB
- **Complete Flow**: < 5s from post creation to completion
- **Concurrent Tasks**: Support 10 concurrent executions without degradation

#### 4.3.2 Resource Limits
```typescript
const RESOURCE_LIMITS = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxContentLength: 50000, // 50k chars in post
  maxConcurrentTasks: 10,
  taskExecutionTimeout: 30000, // 30s
  maxRetries: 3
};
```

---

### 4.4 Error Messages and User Feedback

```typescript
const ERROR_MESSAGES = {
  PARSE_ERROR: {
    code: 'PARSE_ERROR',
    userMessage: 'I couldn\'t understand your request. Could you rephrase it? Example: "Create file test.txt with content Hello"',
    retry: false
  },

  VALIDATION_ERROR_PATH: {
    code: 'VALIDATION_ERROR',
    userMessage: 'The file path is invalid or outside the allowed workspace directory.',
    retry: false
  },

  VALIDATION_ERROR_SIZE: {
    code: 'VALIDATION_ERROR',
    userMessage: 'The file content is too large. Maximum size is 10MB.',
    retry: false
  },

  EXECUTION_ERROR_EXISTS: {
    code: 'EXECUTION_ERROR',
    userMessage: 'File already exists. Use "update" or "modify" to change existing files.',
    retry: false
  },

  EXECUTION_ERROR_NOT_FOUND: {
    code: 'EXECUTION_ERROR',
    userMessage: 'File not found. Check the file path and try again.',
    retry: false
  },

  EXECUTION_ERROR_PERMISSION: {
    code: 'PERMISSION_ERROR',
    userMessage: 'Permission denied. This operation is not allowed.',
    retry: false
  },

  SYSTEM_ERROR: {
    code: 'SYSTEM_ERROR',
    userMessage: 'An unexpected error occurred. The team has been notified. Please try again later.',
    retry: true
  }
};
```

---

## Phase 5: Completion

### 5.1 Deployment Checklist

- [ ] All unit tests passing (>90% coverage)
- [ ] All integration tests passing
- [ ] All E2E tests passing
- [ ] Security audit completed
- [ ] Performance benchmarks met
- [ ] Backward compatibility verified
- [ ] Database migrations prepared (if needed)
- [ ] Monitoring dashboards configured
- [ ] Error alerting configured
- [ ] Documentation updated
- [ ] Code review completed
- [ ] Staging deployment successful
- [ ] Production deployment plan reviewed

---

### 5.2 Rollout Strategy

#### Phase 5.1: Canary Deployment (10% traffic)
- Deploy to production with feature flag disabled
- Enable for internal testing only
- Monitor error rates and performance
- Duration: 2 days

#### Phase 5.2: Limited Rollout (25% traffic)
- Enable for 25% of users via feature flag
- Monitor task success rates
- Collect user feedback
- Duration: 1 week

#### Phase 5.3: Full Rollout (100% traffic)
- Enable for all users
- Continue monitoring
- Be ready to rollback if issues detected
- Duration: Ongoing

---

### 5.3 Monitoring and Observability

#### Metrics to Monitor
```typescript
// Prometheus metrics
const metrics = {
  // Counters
  task_executions_total: new Counter({
    name: 'task_executions_total',
    help: 'Total task executions',
    labelNames: ['task_type', 'status']
  }),

  task_errors_total: new Counter({
    name: 'task_errors_total',
    help: 'Total task errors',
    labelNames: ['error_type']
  }),

  // Histograms
  task_execution_duration_ms: new Histogram({
    name: 'task_execution_duration_ms',
    help: 'Task execution duration in milliseconds',
    labelNames: ['task_type'],
    buckets: [100, 500, 1000, 2000, 5000, 10000, 30000]
  }),

  // Gauges
  active_task_executions: new Gauge({
    name: 'active_task_executions',
    help: 'Number of active task executions'
  })
};
```

#### Alerting Rules
```yaml
alerts:
  - alert: HighTaskFailureRate
    expr: rate(task_errors_total[5m]) > 0.1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: High task failure rate detected

  - alert: TaskExecutionTimeout
    expr: histogram_quantile(0.95, task_execution_duration_ms) > 30000
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: Task execution taking too long

  - alert: PathSecurityViolation
    expr: increase(task_errors_total{error_type="PERMISSION_ERROR"}[5m]) > 5
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: Multiple path security violations detected
```

---

### 5.4 Documentation

#### 5.4.1 User Documentation

**Title**: "How to Request Tasks from AVI"

**Content**:
```markdown
# Requesting Tasks from AVI

AVI can now execute tasks for you! Just create a post with your request.

## Supported Tasks

### File Creation
**Example**: "Create file todo.txt with content My tasks for today"
- Creates a new file in your workspace
- Fails if file already exists

### File Modification
**Example**: "Update todo.txt to append Buy groceries"
- Modifies an existing file
- Use "append" to add content, "replace" to overwrite

### File Deletion
**Example**: "Delete file old-notes.txt"
- Permanently deletes a file
- Cannot be undone

### Directory Listing
**Example**: "List files in my workspace"
- Shows all files and directories
- Includes file sizes and types

## Tips for Best Results

1. **Be specific**: Include exact file names and content
2. **Use quotes**: Put file content in quotes for clarity
3. **Check paths**: Files are created in /prod/agent_workspace/
4. **Start simple**: Try basic tasks first

## Need Help?

If AVI doesn't understand your request, try rephrasing it or breaking it into smaller steps.
```

---

#### 5.4.2 Developer Documentation

**Title**: "Adding New Task Types"

**Content**:
```markdown
# Adding New Task Types to AVI Worker

This guide explains how to add support for new task types.

## Step 1: Define Task Type

Add to `/src/worker/task-execution/types.ts`:

```typescript
export type TaskType =
  | 'file_creation'
  | 'file_modification'
  | 'file_deletion'
  | 'directory_listing'
  | 'your_new_task'; // Add here
```

## Step 2: Create Executor

Create `/src/worker/task-execution/executors/your-new-task.executor.ts`:

```typescript
import { TaskExecutor, TaskResult } from '../types';

export class YourNewTaskExecutor implements TaskExecutor {
  async execute(parameters: Record<string, any>): Promise<TaskResult> {
    // Validate parameters
    // Execute task
    // Return result
  }
}
```

## Step 3: Register Executor

Update `/src/worker/task-execution/executors/factory.ts`:

```typescript
case 'your_new_task':
  return new YourNewTaskExecutor();
```

## Step 4: Add Parsing Pattern

Update `/src/worker/task-execution/task-patterns.ts`:

```typescript
{
  type: 'your_new_task',
  regex: /pattern to match/i,
  parameterMap: {
    1: 'param_name'
  }
}
```

## Step 5: Write Tests

Create tests in `/tests/unit/task-execution/executors/your-new-task.test.ts`

## Step 6: Update Documentation

Add examples to user documentation.
```

---

### 5.5 Success Criteria

#### Quantitative Metrics
- [ ] 95% of valid task requests complete successfully
- [ ] Task execution time < 5s (95th percentile)
- [ ] Zero path traversal vulnerabilities detected
- [ ] Zero breaking changes to RSS feed processing
- [ ] Test coverage > 85%

#### Qualitative Metrics
- [ ] User feedback: "Easy to use"
- [ ] Developer feedback: "Easy to add new task types"
- [ ] Operations feedback: "Easy to monitor and debug"
- [ ] Security feedback: "No major concerns"

---

## Appendix A: File Structure

```
/workspaces/agent-feed/api-server/
├── src/
│   ├── worker/
│   │   ├── agent-worker.ts (MODIFY)
│   │   ├── response-generator.ts
│   │   ├── memory-updater.ts
│   │   └── task-execution/ (NEW)
│   │       ├── types.ts
│   │       ├── execution-mode-detector.ts
│   │       ├── path-validator.ts
│   │       ├── task-parser.ts
│   │       ├── task-patterns.ts
│   │       ├── executors/
│   │       │   ├── task-executor.interface.ts
│   │       │   ├── file-creation.executor.ts
│   │       │   ├── file-modification.executor.ts
│   │       │   ├── file-deletion.executor.ts
│   │       │   ├── directory-listing.executor.ts
│   │       │   ├── system-info.executor.ts
│   │       │   └── factory.ts
│   │       └── index.ts
│   ├── adapters/
│   │   └── worker-spawner.adapter.ts (MODIFY)
│   └── api/
│       └── routes/
│           └── posts.ts (MODIFY - optional enhancement)
├── tests/
│   ├── unit/
│   │   └── task-execution/
│   │       ├── path-validator.test.ts
│   │       ├── task-parser.test.ts
│   │       └── executors/
│   │           ├── file-creation.test.ts
│   │           ├── file-modification.test.ts
│   │           ├── file-deletion.test.ts
│   │           └── directory-listing.test.ts
│   ├── integration/
│   │   └── task-execution/
│   │       ├── user-task-flow.test.ts
│   │       └── task-post-creation.test.ts
│   ├── e2e/
│   │   └── task-execution/
│   │       └── complete-flow.test.ts
│   └── security/
│       └── task-execution/
│           └── path-security.test.ts
└── docs/
    ├── SPARC-AVI-Worker-Fix.md (THIS FILE)
    └── task-execution/
        ├── user-guide.md
        └── developer-guide.md
```

---

## Appendix B: Example Requests and Responses

### Example 1: File Creation

**User Request**:
```
POST /api/v1/posts
{
  "title": "Create Notes File",
  "content": "Create file meeting-notes.txt with content Meeting on 2025-10-13: Discussed AVI improvements",
  "authorAgent": "user",
  "metadata": {
    "executionMode": "task_execution"
  }
}
```

**System Response**:
```json
{
  "success": true,
  "taskType": "file_creation",
  "operation": "Created file meeting-notes.txt",
  "details": {
    "path": "/workspaces/agent-feed/prod/agent_workspace/meeting-notes.txt",
    "size": 58,
    "preview": "Meeting on 2025-10-13: Discussed AVI improvements"
  },
  "timestamp": "2025-10-13T12:34:56Z"
}
```

---

### Example 2: File Deletion

**User Request**:
```
POST /api/v1/posts
{
  "title": "Delete Old File",
  "content": "Delete file old-notes.txt",
  "authorAgent": "user",
  "metadata": {
    "executionMode": "task_execution"
  }
}
```

**System Response**:
```json
{
  "success": true,
  "taskType": "file_deletion",
  "operation": "Deleted file old-notes.txt",
  "details": {
    "path": "/workspaces/agent-feed/prod/agent_workspace/old-notes.txt"
  },
  "timestamp": "2025-10-13T12:35:23Z"
}
```

---

### Example 3: Parse Error

**User Request**:
```
POST /api/v1/posts
{
  "title": "Ambiguous Request",
  "content": "Do something with my file",
  "authorAgent": "user",
  "metadata": {
    "executionMode": "task_execution"
  }
}
```

**System Response**:
```json
{
  "success": false,
  "error": "PARSE_ERROR",
  "message": "I couldn't understand your request. Could you rephrase it? Example: 'Create file test.txt with content Hello'",
  "suggestions": [
    "Create file <filename> with content <content>",
    "Delete file <filename>",
    "Update file <filename> to append <content>",
    "List files in <directory>"
  ],
  "timestamp": "2025-10-13T12:36:45Z"
}
```

---

## Appendix C: Migration Notes

### Database Changes
**NO SCHEMA CHANGES REQUIRED**

The solution uses existing `post_metadata` and `work_queue.post_metadata` JSONB fields for new data. No migrations needed.

### API Changes
**BACKWARD COMPATIBLE**

- Existing POST /api/v1/posts continues to work
- New `executionMode` field is optional
- Defaults to `feed_response` if not specified

### Worker Changes
**BACKWARD COMPATIBLE**

- Existing RSS feed processing unchanged
- New execution path only triggered for task execution mode
- All existing tests pass without modification

---

## Appendix D: Glossary

| Term | Definition |
|------|------------|
| **Execution Mode** | Type of work ticket: `feed_response` (RSS processing) or `task_execution` (user tasks) |
| **Task Type** | Specific operation: `file_creation`, `file_deletion`, etc. |
| **Task Executor** | Class that implements specific task type execution |
| **Task Parser** | Component that extracts task information from user content |
| **Path Validator** | Security component that validates file paths |
| **Work Ticket** | Database record representing unit of work for agent |
| **Agent Workspace** | `/workspaces/agent-feed/prod/agent_workspace/` - isolated directory for agent operations |
| **Feed Response** | Legacy mode: generate response to RSS feed item |
| **Task Execution** | New mode: execute user-requested file/system tasks |

---

## Document Metadata

**Version History**:
- v1.0 (2025-10-13): Initial SPARC specification

**Authors**:
- Claude (AI Assistant)

**Stakeholders**:
- Development Team
- Product Team
- Security Team
- Operations Team

**Related Documents**:
- AVI Architecture Documentation
- Work Queue Implementation
- AgentWorker Implementation
- Security Guidelines

**Status**: APPROVED FOR IMPLEMENTATION

---

**END OF SPARC SPECIFICATION**
