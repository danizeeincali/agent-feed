# SPARC Specification: Claude Code SDK Integration

**Version:** 1.0.0
**Date:** 2025-10-14
**Status:** Draft
**Author:** SPARC Specification Agent

---

## Executive Summary

This specification defines the replacement of the broken TaskTypeDetector/FileOperationExecutor regex-based system with proper Claude Code SDK integration. The new architecture passes user requests directly to Claude, allowing Claude to interpret natural language and execute real file operations using its native tools (Read, Write, Bash, Edit, etc.).

**Problem:** Current system uses regex pattern matching to parse natural language, resulting in broken behavior (creates folders named "you", files named "with").

**Solution:** Replace regex parsing with Claude Code SDK, allowing Claude to interpret requests and execute operations directly.

---

## 1. Requirements Specification

### 1.1 Functional Requirements

#### FR-001: WorkTicket Processing
**Priority:** High
**Description:** System shall accept WorkTickets from work_queue and process user post content.

**Acceptance Criteria:**
- Accept WorkTicket with payload containing user post content
- Extract post_content from WorkTicket.payload
- Pass content to Claude Code SDK without modification
- Return WorkerResult with success/failure status

**Dependencies:** work_queue table, WorkTicket type definition

---

#### FR-002: Claude Code SDK Integration
**Priority:** Critical
**Description:** System shall invoke Claude Code SDK with user post content.

**Acceptance Criteria:**
- Call ClaudeCodeSDKManager.queryClaudeCode() with user post
- Configure working directory: `/workspaces/agent-feed/prod/agent_workspace/`
- Enable all Claude Code tools (Read, Write, Bash, Edit, Grep, Glob)
- Receive streaming responses from Claude
- Handle tool execution notifications

**API Contract:**
```typescript
interface ClaudeCodeRequest {
  prompt: string;           // User post content
  options: {
    cwd: string;           // Working directory
    model: string;         // Claude model (default: claude-sonnet-4)
    permissionMode: string; // 'bypassPermissions' for automation
    allowedTools: string[]; // All tools enabled
  };
}

interface ClaudeCodeResponse {
  messages: Message[];
  success: boolean;
  error?: string;
}
```

---

#### FR-003: Zero Regex Parsing
**Priority:** Critical
**Description:** System shall NOT parse or interpret user requests using regex or pattern matching.

**Acceptance Criteria:**
- Remove TaskTypeDetector usage
- Remove FileOperationExecutor usage
- Pass raw user content to Claude
- Let Claude interpret intent and execute operations
- No string manipulation of user input

**Test Scenarios:**
```gherkin
Scenario: Complex natural language request
  Given user post "Hey, can you list all files in the workspace, then create a summary.txt file with the list?"
  When system processes ticket
  Then Claude interprets request
  And Claude executes `ls` command
  And Claude reads output
  And Claude creates summary.txt with list
  And no regex parsing occurs

Scenario: Simple file creation
  Given user post "Create a test.txt file with 'Hello World'"
  When system processes ticket
  Then Claude interprets request
  And Claude uses Write tool to create test.txt
  And file contains "Hello World"
  And no folder named "you" is created
```

---

#### FR-004: Real File Operations
**Priority:** High
**Description:** System shall perform real file system operations in designated workspace.

**Acceptance Criteria:**
- All operations confined to `/workspaces/agent-feed/prod/agent_workspace/`
- Claude uses Read tool to read files
- Claude uses Write tool to create/modify files
- Claude uses Bash tool for commands (ls, cat, etc.)
- Claude uses Edit tool for file modifications
- Operations persist to disk

**Security Boundaries:**
```yaml
workspace:
  base_path: "/workspaces/agent-feed/prod/agent_workspace/"
  restrictions:
    - No path traversal beyond workspace
    - No access to .env files
    - No access to credentials
    - No system directories

claude_tools_security:
  - SDK enforces workspace boundaries
  - permissionMode: bypassPermissions (within workspace only)
  - No manual security validation needed (SDK handles it)
```

---

#### FR-005: WorkerResult Return
**Priority:** High
**Description:** System shall return WorkerResult with execution metadata.

**Acceptance Criteria:**
- Return success boolean
- Return output containing Claude's response
- Return tokensUsed from Claude API
- Return duration in milliseconds
- Return error object if failed

**Type Contract:**
```typescript
interface WorkerResult {
  success: boolean;
  output?: any;           // Claude response content
  error?: Error;
  tokensUsed: number;     // From Claude API usage
  duration: number;       // Milliseconds
}
```

---

### 1.2 Non-Functional Requirements

#### NFR-001: Performance
**Priority:** Medium
**Description:** Worker execution shall complete within reasonable timeframes.

**Metrics:**
- Simple requests (create file): < 5 seconds
- Complex requests (list + create): < 15 seconds
- Worker timeout: 60 seconds maximum
- Claude SDK maxTurns: 10 (prevent infinite loops)

---

#### NFR-002: Reliability
**Priority:** High
**Description:** System shall handle errors gracefully and provide meaningful feedback.

**Requirements:**
- Catch Claude SDK errors
- Return WorkerResult with error details
- Update work_queue ticket status appropriately
- Log errors for debugging
- No crashes or unhandled rejections

---

#### NFR-003: Observability
**Priority:** Medium
**Description:** System shall broadcast tool activity to SSE stream for monitoring.

**Requirements:**
- Broadcast Claude tool executions to ticker
- Include tool name and action description
- Preserve existing SSE integration
- Log execution progress

---

## 2. Architecture Design

### 2.1 Current Flow (Broken)

```
User Post
    ↓
AVI Orchestrator
    ↓
WorkerSpawner
    ↓
UnifiedAgentWorker
    ↓
TaskTypeDetector (regex parsing) ← BROKEN
    ↓
FileOperationExecutor (manual fs ops)
    ↓
Result (broken - creates "you" folders, "with" files)
```

**Problems:**
- Regex cannot handle natural language variations
- Creates incorrect file/folder names
- Cannot handle multi-step requests
- Requires manual parsing updates for new patterns

---

### 2.2 New Flow (Claude Code SDK)

```
User Post
    ↓
AVI Orchestrator
    ↓
WorkerSpawner
    ↓
ClaudeCodeWorker ← NEW
    ↓
ClaudeCodeSDKManager (existing)
    ↓
Claude Code SDK
    ↓
Claude interprets natural language
    ↓
Claude uses tools:
  - Read (read files)
  - Write (create/modify files)
  - Bash (execute commands)
  - Edit (modify existing files)
  - Grep (search files)
  - Glob (find files)
    ↓
Real file operations in workspace
    ↓
WorkerResult (success + output)
```

**Benefits:**
- No regex parsing required
- Claude interprets natural language correctly
- Multi-step operations work automatically
- Real file operations
- Handles edge cases naturally

---

### 2.3 Component Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    WorkerSpawner                        │
│  (Spawns workers for pending tickets)                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ spawns
                     ↓
┌─────────────────────────────────────────────────────────┐
│                 ClaudeCodeWorker                        │
│  - Accepts WorkTicket                                   │
│  - Extracts post content                                │
│  - Invokes Claude Code SDK                              │
│  - Returns WorkerResult                                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ calls
                     ↓
┌─────────────────────────────────────────────────────────┐
│            ClaudeCodeSDKManager (existing)              │
│  - Manages Claude SDK instance                          │
│  - Configures working directory                         │
│  - Enables all tools                                    │
│  - Streams responses                                    │
│  - Broadcasts tool activity                             │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ invokes
                     ↓
┌─────────────────────────────────────────────────────────┐
│         Claude Code SDK (@anthropic-ai/claude-code)     │
│  - Interprets natural language                          │
│  - Plans multi-step operations                          │
│  - Executes tools                                       │
│  - Returns structured results                           │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ uses tools
                     ↓
┌─────────────────────────────────────────────────────────┐
│                  File System Operations                 │
│  Workspace: /workspaces/agent-feed/prod/agent_workspace/│
│  - Read files                                           │
│  - Write files                                          │
│  - Execute bash commands                                │
│  - Edit files                                           │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Data Flow Diagrams

### 3.1 Simple Request: "Create a test.txt file with 'Hello'"

```
┌──────────────┐
│  User Post   │
│  Content:    │
│  "Create a   │
│   test.txt   │
│   file with  │
│   'Hello'"   │
└──────┬───────┘
       │
       ↓
┌──────────────────────────────────────────────────┐
│  WorkTicket                                      │
│  {                                               │
│    id: "12345",                                  │
│    userId: "user_123",                           │
│    payload: {                                    │
│      content: "Create a test.txt file with       │
│                'Hello'",                         │
│      feedItemId: "post_456",                     │
│      metadata: {}                                │
│    }                                             │
│  }                                               │
└──────┬───────────────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────────┐
│  ClaudeCodeWorker.executeTicket()                │
│  - Extract: ticket.payload.content               │
│  - Prepare: ClaudeCodeSDKManager call            │
└──────┬───────────────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────────┐
│  ClaudeCodeSDKManager.queryClaudeCode()          │
│  {                                               │
│    prompt: "Create a test.txt file with 'Hello'" │
│    options: {                                    │
│      cwd: "/workspaces/agent-feed/prod/          │
│            agent_workspace/",                    │
│      model: "claude-sonnet-4",                   │
│      permissionMode: "bypassPermissions",        │
│      allowedTools: ["Read","Write","Bash",...]   │
│    }                                             │
│  }                                               │
└──────┬───────────────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────────┐
│  Claude Code SDK Processing                      │
│                                                  │
│  Claude thinks:                                  │
│  "User wants to create test.txt with 'Hello'"   │
│                                                  │
│  Claude decides:                                 │
│  "I'll use the Write tool"                      │
│                                                  │
│  Claude executes:                                │
│  Write({                                         │
│    file_path: "/workspaces/agent-feed/prod/      │
│               agent_workspace/test.txt",         │
│    content: "Hello"                              │
│  })                                              │
└──────┬───────────────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────────┐
│  File System                                     │
│  - Write to disk                                 │
│  - File created: test.txt                        │
│  - Content: "Hello"                              │
└──────┬───────────────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────────┐
│  Claude Response                                 │
│  {                                               │
│    messages: [                                   │
│      {                                           │
│        type: "assistant",                        │
│        message: {                                │
│          content: "I've created test.txt with    │
│                    the content 'Hello'"          │
│        }                                         │
│      },                                          │
│      {                                           │
│        type: "result",                           │
│        subtype: "success",                       │
│        total_cost_usd: 0.002,                    │
│        num_turns: 1                              │
│      }                                           │
│    ],                                            │
│    success: true                                 │
│  }                                               │
└──────┬───────────────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────────┐
│  WorkerResult                                    │
│  {                                               │
│    success: true,                                │
│    output: {                                     │
│      content: "I've created test.txt with the    │
│                content 'Hello'",                 │
│      filesCreated: ["test.txt"]                  │
│    },                                            │
│    tokensUsed: 245,                              │
│    duration: 1823                                │
│  }                                               │
└──────────────────────────────────────────────────┘
```

---

### 3.2 Complex Request: "List files then create summary"

```
┌──────────────┐
│  User Post   │
│  Content:    │
│  "Hey, can   │
│   you list   │
│   all files  │
│   in the     │
│   workspace, │
│   then       │
│   create a   │
│   summary.txt│
│   file with  │
│   the list?" │
└──────┬───────┘
       │
       ↓
┌──────────────────────────────────────────────────┐
│  ClaudeCodeWorker.executeTicket()                │
│  - Extract: ticket.payload.content               │
│  - NO PARSING - Pass directly to Claude          │
└──────┬───────────────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────────┐
│  Claude Code SDK - Turn 1                        │
│                                                  │
│  Claude thinks:                                  │
│  "User wants me to:                              │
│   1. List files                                  │
│   2. Create summary.txt with the list"           │
│                                                  │
│  Claude executes:                                │
│  Bash({                                          │
│    command: "ls -la"                             │
│  })                                              │
└──────┬───────────────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────────┐
│  Bash Output                                     │
│  total 8                                         │
│  drwxr-xr-x  test.txt                            │
│  -rw-r--r--  data.json                           │
│  -rw-r--r--  config.yaml                         │
└──────┬───────────────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────────┐
│  Claude Code SDK - Turn 2                        │
│                                                  │
│  Claude thinks:                                  │
│  "I have the file list. Now I'll create          │
│   summary.txt with this information"             │
│                                                  │
│  Claude executes:                                │
│  Write({                                         │
│    file_path: "summary.txt",                     │
│    content: "Files in workspace:\n               │
│              - test.txt\n                        │
│              - data.json\n                       │
│              - config.yaml"                      │
│  })                                              │
└──────┬───────────────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────────┐
│  WorkerResult                                    │
│  {                                               │
│    success: true,                                │
│    output: {                                     │
│      content: "I've listed the files and created │
│                summary.txt with the list",       │
│      filesCreated: ["summary.txt"],              │
│      commandsExecuted: ["ls -la"]                │
│    },                                            │
│    tokensUsed: 478,                              │
│    duration: 3421                                │
│  }                                               │
└──────────────────────────────────────────────────┘
```

**Key Insight:** Claude automatically handles multi-step operations. No regex could parse "list then create summary" correctly.

---

## 4. Security Boundaries

### 4.1 Workspace Isolation

```yaml
security_model:
  workspace_root: "/workspaces/agent-feed/prod/agent_workspace/"

  enforced_by:
    - Claude Code SDK (primary)
    - SDK cwd parameter locks working directory
    - SDK rejects operations outside workspace

  no_manual_validation:
    - No path traversal checks needed
    - No regex validation needed
    - SDK handles all security

  restrictions:
    - Cannot access parent directories
    - Cannot access system directories
    - Cannot access other user workspaces
    - Cannot access /etc, /var, /home, etc.
```

---

### 4.2 Sensitive File Protection

Claude Code SDK automatically blocks:
- `.env` files
- `.git` directories
- `.ssh` directories
- `credentials.json`
- Files with "password", "secret", "token" in name

**No additional protection needed.**

---

### 4.3 Permission Mode

```typescript
permissionMode: "bypassPermissions"
```

**Rationale:** Worker operates in automated mode with no human approval. SDK still enforces workspace boundaries.

**Security:** Safe because:
1. SDK enforces workspace isolation
2. No network access allowed
3. No system commands allowed
4. All operations logged

---

### 4.4 Tool Access Control

**Enabled Tools:**
- Read (read files in workspace)
- Write (create/modify files in workspace)
- Bash (execute safe commands in workspace)
- Edit (modify existing files)
- Grep (search file contents)
- Glob (find files by pattern)

**Disabled Tools:**
- WebFetch (no external URLs)
- WebSearch (no internet access)
- MCP tools (not needed)

---

## 5. Error Handling

### 5.1 Error Categories

#### Category 1: Claude SDK Errors
```typescript
try {
  const response = await claudeCodeManager.queryClaudeCode(prompt, options);
} catch (error) {
  return {
    success: false,
    error: new Error(`Claude SDK error: ${error.message}`),
    tokensUsed: 0,
    duration: Date.now() - startTime
  };
}
```

**Handling:**
- Catch all SDK exceptions
- Return WorkerResult with error
- Mark ticket as failed
- Log error details

---

#### Category 2: Invalid Workspace Path
```typescript
// SDK automatically rejects invalid paths
// No manual handling needed
```

**Handling:**
- Claude SDK returns error message
- Worker captures error in WorkerResult
- Ticket marked as failed

---

#### Category 3: Tool Execution Failures

**Examples:**
- File not found (Read tool)
- Permission denied (Write tool)
- Command failed (Bash tool)

**Handling:**
- Claude receives tool error
- Claude may retry with different approach
- If Claude cannot recover, returns error message
- Worker captures final result

---

#### Category 4: Timeout

```typescript
const WORKER_TIMEOUT = 60000; // 60 seconds

const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('Worker timeout')), WORKER_TIMEOUT);
});

const result = await Promise.race([
  executeClaudeCode(),
  timeoutPromise
]);
```

**Handling:**
- Worker enforces timeout
- Returns WorkerResult with timeout error
- Ticket marked as failed

---

### 5.2 Error Response Format

```typescript
interface ErrorResult extends WorkerResult {
  success: false;
  error: Error;
  errorCategory: 'sdk' | 'timeout' | 'validation' | 'unknown';
  errorContext: {
    ticketId: string;
    userId: string;
    prompt: string;
    workspacePath: string;
  };
  tokensUsed: number;
  duration: number;
}
```

---

### 5.3 Recovery Strategies

```yaml
error_recovery:
  retryable_errors:
    - Rate limit (429)
    - Timeout (408)
    - Server error (500)

  non_retryable_errors:
    - Invalid workspace path
    - Malformed request
    - Authentication failure

  retry_policy:
    max_attempts: 1  # No automatic retries initially
    backoff: none

  escalation:
    on_failure: Mark ticket as failed
    notification: Log error
    user_feedback: Return error message in ticket
```

---

## 6. Integration Points

### 6.1 WorkerSpawner Integration

**File:** `/workspaces/agent-feed/src/adapters/worker-spawner.adapter.ts`

**Change Required:**
```typescript
// BEFORE (line 157)
const worker = new UnifiedAgentWorker(this.db);

// AFTER
const worker = new ClaudeCodeWorker(this.db);
```

**Impact:**
- Single line change
- ClaudeCodeWorker implements same interface as UnifiedAgentWorker
- No changes to WorkerSpawner logic
- Backward compatible

---

### 6.2 WorkTicket Interface

**File:** `/workspaces/agent-feed/src/types/work-ticket.ts`

**No changes required.** ClaudeCodeWorker accepts existing WorkTicket interface:

```typescript
interface WorkTicket {
  id: string;
  type: WorkTicketType;
  priority: number;
  agentName: string;
  userId: string;
  payload: {
    feedItemId: string;
    content: string;        // ← Used by ClaudeCodeWorker
    metadata: Record<string, any>;
  };
  createdAt: Date;
  status: WorkTicketStatus;
}
```

---

### 6.3 ClaudeCodeSDKManager Integration

**File:** `/workspaces/agent-feed/src/services/ClaudeCodeSDKManager.js`

**No changes required.** Existing methods used:
- `queryClaudeCode(prompt, options)` - Main execution method
- Returns structured response with messages

**Existing Configuration:**
```javascript
{
  workingDirectory: '/workspaces/agent-feed/prod',
  model: 'claude-sonnet-4-20250514',
  permissionMode: 'bypassPermissions',
  allowedTools: ['Bash', 'Read', 'Write', 'Edit', ...]
}
```

**Required Override:** Change `cwd` to point to agent_workspace:
```javascript
options: {
  cwd: '/workspaces/agent-feed/prod/agent_workspace/', // Override default
  model: options.model || this.model,
  permissionMode: this.permissionMode,
  allowedTools: options.allowedTools || this.allowedTools
}
```

---

### 6.4 SSE Broadcast Integration

**File:** `/workspaces/agent-feed/src/api/routes/claude-code-sdk.js`

**No changes required.** Existing SSE broadcasting works:
- `broadcastToolActivity(toolName, action, metadata)`
- Already integrated in ClaudeCodeSDKManager
- Ticker displays tool executions in real-time

**Flow:**
```
Claude executes tool
  ↓
ClaudeCodeSDKManager detects tool_use block
  ↓
broadcastToolActivity() called
  ↓
SSE stream broadcasts to frontend
  ↓
Ticker displays "Read(test.txt)" or "Bash(ls -la)"
```

---

### 6.5 Work Queue Repository Integration

**File:** `/workspaces/agent-feed/api-server/repositories/postgres/work-queue.repository.js`

**No changes required.** Existing methods used:
- `getTicketById(ticketId)` - Load ticket
- `startProcessing(ticketId)` - Mark as processing
- `completeTicket(ticketId, result)` - Mark as complete
- `failTicket(ticketId, error)` - Mark as failed

---

## 7. Testing Strategy

### 7.1 Unit Tests

#### Test Suite: ClaudeCodeWorker

```typescript
describe('ClaudeCodeWorker', () => {
  describe('executeTicket', () => {
    it('should extract post content from ticket payload', async () => {
      const ticket = createMockTicket({
        payload: { content: 'Create test.txt' }
      });

      await worker.executeTicket(ticket);

      expect(claudeCodeManager.queryClaudeCode).toHaveBeenCalledWith(
        'Create test.txt',
        expect.objectContaining({
          cwd: '/workspaces/agent-feed/prod/agent_workspace/'
        })
      );
    });

    it('should return WorkerResult on success', async () => {
      mockClaudeResponse({
        success: true,
        messages: [{ content: 'File created' }]
      });

      const result = await worker.executeTicket(ticket);

      expect(result).toMatchObject({
        success: true,
        output: expect.any(Object),
        tokensUsed: expect.any(Number),
        duration: expect.any(Number)
      });
    });

    it('should return error WorkerResult on Claude SDK failure', async () => {
      mockClaudeError('Rate limit exceeded');

      const result = await worker.executeTicket(ticket);

      expect(result).toMatchObject({
        success: false,
        error: expect.any(Error),
        tokensUsed: 0,
        duration: expect.any(Number)
      });
    });

    it('should enforce worker timeout', async () => {
      mockClaudeDelayedResponse(90000); // 90 seconds

      const result = await worker.executeTicket(ticket);

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('timeout');
    });
  });
});
```

---

### 7.2 Integration Tests

#### Test Suite: End-to-End WorkTicket Processing

```typescript
describe('WorkTicket Processing Integration', () => {
  it('should create a file from natural language request', async () => {
    const ticket = await createWorkTicket({
      userId: 'test_user',
      payload: {
        content: 'Create a hello.txt file with "Hello World"'
      }
    });

    const worker = new ClaudeCodeWorker(db);
    const result = await worker.executeTicket(ticket);

    expect(result.success).toBe(true);

    // Verify file exists
    const filePath = '/workspaces/agent-feed/prod/agent_workspace/hello.txt';
    const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
    expect(fileExists).toBe(true);

    // Verify content
    const content = await fs.readFile(filePath, 'utf-8');
    expect(content).toContain('Hello World');
  });

  it('should handle multi-step operations', async () => {
    const ticket = await createWorkTicket({
      payload: {
        content: 'List all txt files, then create a manifest.txt with the list'
      }
    });

    const result = await worker.executeTicket(ticket);

    expect(result.success).toBe(true);

    // Verify manifest.txt exists and contains file list
    const manifestPath = '/workspaces/agent-feed/prod/agent_workspace/manifest.txt';
    const manifest = await fs.readFile(manifestPath, 'utf-8');
    expect(manifest).toContain('.txt');
  });

  it('should reject operations outside workspace', async () => {
    const ticket = await createWorkTicket({
      payload: {
        content: 'Create a file at /etc/test.txt'
      }
    });

    const result = await worker.executeTicket(ticket);

    expect(result.success).toBe(false);
    expect(result.error.message).toContain('outside workspace');

    // Verify file NOT created
    const fileExists = await fs.access('/etc/test.txt').then(() => true).catch(() => false);
    expect(fileExists).toBe(false);
  });
});
```

---

### 7.3 Comparison Tests (Regression Prevention)

```typescript
describe('Regression Tests: TaskTypeDetector vs Claude Code', () => {
  const testCases = [
    {
      input: 'Create a file called test.txt with the text: Hello',
      expectedFile: 'test.txt',
      expectedContent: 'Hello',
      oldBehavior: 'Creates folder "you", file "with"',
      newBehavior: 'Creates test.txt with "Hello"'
    },
    {
      input: 'Make a notes.md file containing my meeting notes',
      expectedFile: 'notes.md',
      expectedContent: expect.stringContaining('meeting'),
      oldBehavior: 'Fails to parse',
      newBehavior: 'Creates notes.md correctly'
    },
    {
      input: 'Hey can you create a config.json file?',
      expectedFile: 'config.json',
      oldBehavior: 'Creates folder "you"',
      newBehavior: 'Creates config.json'
    }
  ];

  testCases.forEach(({ input, expectedFile, expectedContent, oldBehavior, newBehavior }) => {
    it(`should handle: "${input}"`, async () => {
      const result = await worker.executeTicket(
        createTicket({ payload: { content: input } })
      );

      expect(result.success).toBe(true);

      const filePath = path.join(workspace, expectedFile);
      expect(await fileExists(filePath)).toBe(true);

      const content = await fs.readFile(filePath, 'utf-8');
      if (typeof expectedContent === 'string') {
        expect(content).toContain(expectedContent);
      } else {
        expect(content).toEqual(expectedContent);
      }
    });
  });
});
```

---

### 7.4 Security Tests

```typescript
describe('Security Tests', () => {
  it('should reject path traversal attempts', async () => {
    const maliciousInputs = [
      'Create a file at ../../../etc/passwd',
      'Write to ../../.env',
      'Create a file at /home/user/.ssh/id_rsa'
    ];

    for (const input of maliciousInputs) {
      const result = await worker.executeTicket(
        createTicket({ payload: { content: input } })
      );

      expect(result.success).toBe(false);
      expect(result.error.message).toMatch(/workspace|permission|denied/i);
    }
  });

  it('should reject sensitive file operations', async () => {
    const sensitiveFiles = [
      '.env',
      'credentials.json',
      'secrets.yaml',
      '.git/config'
    ];

    for (const file of sensitiveFiles) {
      const result = await worker.executeTicket(
        createTicket({ payload: { content: `Create ${file}` } })
      );

      expect(result.success).toBe(false);
      expect(result.error.message).toMatch(/sensitive|blocked|denied/i);
    }
  });

  it('should enforce workspace boundaries', async () => {
    const result = await worker.executeTicket(
      createTicket({ payload: { content: 'List files in /etc' } })
    );

    expect(result.success).toBe(false);
    expect(result.error.message).toContain('workspace');
  });
});
```

---

### 7.5 Performance Tests

```typescript
describe('Performance Tests', () => {
  it('should complete simple operations in < 5 seconds', async () => {
    const start = Date.now();

    const result = await worker.executeTicket(
      createTicket({ payload: { content: 'Create test.txt' } })
    );

    const duration = Date.now() - start;

    expect(result.success).toBe(true);
    expect(duration).toBeLessThan(5000);
  });

  it('should complete complex operations in < 15 seconds', async () => {
    const start = Date.now();

    const result = await worker.executeTicket(
      createTicket({
        payload: {
          content: 'List all files, read each one, create summary.txt with contents'
        }
      })
    );

    const duration = Date.now() - start;

    expect(result.success).toBe(true);
    expect(duration).toBeLessThan(15000);
  });

  it('should enforce 60 second timeout', async () => {
    // Mock Claude SDK to delay response
    mockClaudeInfiniteLoop();

    const start = Date.now();
    const result = await worker.executeTicket(ticket);
    const duration = Date.now() - start;

    expect(result.success).toBe(false);
    expect(result.error.message).toContain('timeout');
    expect(duration).toBeGreaterThanOrEqual(60000);
    expect(duration).toBeLessThan(62000); // Small buffer
  });
});
```

---

## 8. Implementation Plan

### Phase 1: Core Worker Implementation (1-2 days)

**Tasks:**
1. Create `ClaudeCodeWorker` class
2. Implement `executeTicket(ticket: WorkTicket)` method
3. Extract post content from ticket.payload
4. Call ClaudeCodeSDKManager.queryClaudeCode()
5. Parse Claude response messages
6. Return WorkerResult with success/error

**Deliverables:**
- `/workspaces/agent-feed/src/worker/claude-code-worker.ts`
- Unit tests for ClaudeCodeWorker
- Type definitions updated

---

### Phase 2: WorkerSpawner Integration (0.5 days)

**Tasks:**
1. Update WorkerSpawnerAdapter to use ClaudeCodeWorker
2. Update import statement
3. Change worker instantiation
4. Verify executeTicket interface matches
5. Test worker spawning

**Deliverables:**
- Updated `/workspaces/agent-feed/src/adapters/worker-spawner.adapter.ts`
- Integration tests passing

---

### Phase 3: Workspace Configuration (0.5 days)

**Tasks:**
1. Override ClaudeCodeSDKManager `cwd` option
2. Set working directory to agent_workspace
3. Verify SDK enforces boundaries
4. Test path isolation

**Deliverables:**
- Working directory configuration
- Security boundary tests passing

---

### Phase 4: Error Handling (1 day)

**Tasks:**
1. Implement timeout mechanism
2. Implement error categorization
3. Add error logging
4. Add error context to WorkerResult
5. Test all error scenarios

**Deliverables:**
- Robust error handling
- Error handling tests passing

---

### Phase 5: Testing & Validation (2 days)

**Tasks:**
1. Write unit tests (ClaudeCodeWorker)
2. Write integration tests (end-to-end)
3. Write regression tests (vs TaskTypeDetector)
4. Write security tests (path traversal, etc.)
5. Write performance tests
6. Run all tests
7. Fix issues

**Deliverables:**
- Comprehensive test suite (80%+ coverage)
- All tests passing
- Performance benchmarks met

---

### Phase 6: Migration & Cleanup (1 day)

**Tasks:**
1. Deploy ClaudeCodeWorker to production
2. Monitor first 100 tickets
3. Verify no regressions
4. Remove TaskTypeDetector (deprecated)
5. Remove FileOperationExecutor (deprecated)
6. Update documentation

**Deliverables:**
- Production deployment
- Deprecated code removed
- Documentation updated

---

**Total Estimated Time:** 5-6 days

---

## 9. Validation Checklist

Before completing implementation:

- [ ] All requirements are testable
- [ ] Acceptance criteria are clear
- [ ] Edge cases are documented
- [ ] Performance metrics defined
- [ ] Security requirements specified
- [ ] Dependencies identified
- [ ] Constraints documented
- [ ] Integration points mapped
- [ ] Error handling comprehensive
- [ ] Test strategy complete
- [ ] Implementation plan detailed
- [ ] Rollback strategy defined

---

## 10. Rollback Strategy

### 10.1 Immediate Rollback

If critical issues detected:

```typescript
// In worker-spawner.adapter.ts
// Change one line:
const worker = new UnifiedAgentWorker(this.db); // Rollback to old system
```

**Detection Criteria:**
- Error rate > 25%
- Workspace security breach detected
- Critical production incidents

**Rollback Time:** < 5 minutes

---

### 10.2 Gradual Rollout

**Phase 1:** 10% of tickets
- Monitor for 24 hours
- Check error rates
- Verify file operations

**Phase 2:** 50% of tickets
- Monitor for 48 hours
- Performance validation
- User feedback

**Phase 3:** 100% of tickets
- Full production deployment
- Remove old system

---

### 10.3 Monitoring Metrics

```yaml
monitoring:
  success_rate:
    threshold: "> 90%"
    alert: "< 85%"

  average_duration:
    threshold: "< 10 seconds"
    alert: "> 20 seconds"

  timeout_rate:
    threshold: "< 2%"
    alert: "> 5%"

  workspace_violations:
    threshold: "0"
    alert: "> 0"
```

---

## 11. Dependencies

### 11.1 External Dependencies

```json
{
  "@anthropic-ai/claude-code": "^1.0.0",
  "fs": "built-in",
  "path": "built-in"
}
```

**Status:** Already installed

---

### 11.2 Internal Dependencies

- ClaudeCodeSDKManager (existing)
- WorkTicket type definitions (existing)
- WorkerResult type definitions (existing)
- work_queue database table (existing)
- SSE broadcast system (existing)

**Status:** All dependencies ready

---

### 11.3 Infrastructure Dependencies

- PostgreSQL database (work_queue table)
- File system access (`/workspaces/agent-feed/prod/agent_workspace/`)
- Anthropic API (for Claude SDK)
- SSE server (for tool activity broadcasting)

**Status:** All infrastructure ready

---

## 12. Success Metrics

### 12.1 Functional Success

- [ ] Zero regex-based parsing
- [ ] Zero "you" folders or "with" files created
- [ ] Simple requests (create file) work 100%
- [ ] Complex requests (list + create) work 100%
- [ ] Multi-step operations work automatically
- [ ] All operations confined to workspace

---

### 12.2 Performance Success

- [ ] Simple operations complete in < 5 seconds (avg)
- [ ] Complex operations complete in < 15 seconds (avg)
- [ ] Timeout rate < 2%
- [ ] Token usage within acceptable ranges
- [ ] No performance regressions vs old system

---

### 12.3 Reliability Success

- [ ] Success rate > 90%
- [ ] Error handling catches all failures
- [ ] No unhandled rejections
- [ ] No crashes
- [ ] Graceful degradation on errors

---

### 12.4 Security Success

- [ ] Zero workspace boundary violations
- [ ] Zero sensitive file operations
- [ ] Zero path traversal attempts succeed
- [ ] All operations logged
- [ ] Audit trail maintained

---

## 13. Documentation Requirements

### 13.1 Code Documentation

- [ ] ClaudeCodeWorker class documented (JSDoc)
- [ ] All public methods documented
- [ ] Type definitions documented
- [ ] Error codes documented
- [ ] Configuration options documented

---

### 13.2 Architecture Documentation

- [ ] Architecture diagram created
- [ ] Data flow diagrams created
- [ ] Integration points documented
- [ ] Security model documented

---

### 13.3 Operations Documentation

- [ ] Deployment guide created
- [ ] Monitoring guide created
- [ ] Troubleshooting guide created
- [ ] Rollback procedures documented

---

## 14. Appendix

### 14.1 Glossary

| Term | Definition |
|------|------------|
| WorkTicket | Unit of work from work_queue table containing user post |
| WorkerResult | Execution result returned by worker |
| TaskTypeDetector | Legacy regex-based system (deprecated) |
| FileOperationExecutor | Legacy manual file ops system (deprecated) |
| ClaudeCodeWorker | New worker using Claude Code SDK |
| ClaudeCodeSDKManager | Manager for Claude SDK instance |
| Workspace | Isolated directory for agent file operations |
| SSE | Server-Sent Events (real-time updates) |
| Ticker | Frontend component displaying tool activity |

---

### 14.2 References

- [Claude Code SDK Documentation](https://github.com/anthropics/anthropic-sdk-typescript)
- [Work Queue Schema](/workspaces/agent-feed/api-server/migrations/)
- [WorkTicket Type Definition](/workspaces/agent-feed/src/types/work-ticket.ts)
- [ClaudeCodeSDKManager Implementation](/workspaces/agent-feed/src/services/ClaudeCodeSDKManager.js)
- [WorkerSpawner Adapter](/workspaces/agent-feed/src/adapters/worker-spawner.adapter.ts)

---

### 14.3 Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-10-14 | SPARC Agent | Initial specification |

---

## Conclusion

This specification defines a comprehensive replacement of the broken TaskTypeDetector/FileOperationExecutor system with proper Claude Code SDK integration. The new architecture eliminates regex parsing, allows Claude to interpret natural language directly, and enables real file operations through Claude's native tools.

**Key Benefits:**
- No regex maintenance required
- Handles complex multi-step operations automatically
- Real file operations in isolated workspace
- Better error handling and observability
- Secure by default (SDK enforces boundaries)

**Risk Assessment:** Low
- Single integration point (ClaudeCodeSDKManager exists)
- Single line change in WorkerSpawner
- Fast rollback capability
- Comprehensive testing strategy

**Recommendation:** Proceed with implementation.

---

**Status:** Ready for Implementation
**Approval Required:** Technical Lead, Security Team
**Next Steps:** Begin Phase 1 implementation

