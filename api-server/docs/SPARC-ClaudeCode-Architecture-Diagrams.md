# Claude Code Integration - Architecture Diagrams

**Version:** 1.0.0
**Date:** 2025-10-14

---

## Diagram 1: System Context

```
┌────────────────────────────────────────────────────────────────┐
│                         Agent Feed System                       │
│                                                                 │
│  ┌─────────────┐      ┌──────────────┐      ┌──────────────┐  │
│  │   User      │      │   Frontend   │      │   Backend    │  │
│  │   Posts     │─────▶│   (React)    │─────▶│   (Express)  │  │
│  └─────────────┘      └──────────────┘      └──────┬───────┘  │
│                                                     │          │
│                                            ┌────────▼────────┐ │
│                                            │   work_queue    │ │
│                                            │   (PostgreSQL)  │ │
│                                            └────────┬────────┘ │
│                                                     │          │
│                                            ┌────────▼────────┐ │
│                                            │  AVI Orchestr.  │ │
│                                            └────────┬────────┘ │
│                                                     │          │
│                                            ┌────────▼────────┐ │
│                                            │ WorkerSpawner   │ │
│                                            └────────┬────────┘ │
│                                                     │          │
│                                         ┌───────────▼──────┐   │
│                                         │ ClaudeCodeWorker │   │
│                                         │     (NEW)        │   │
│                                         └───────────┬──────┘   │
└─────────────────────────────────────────────────────┼──────────┘
                                                      │
                                          ┌───────────▼──────────┐
                                          │ Claude Code SDK      │
                                          │ (@anthropic-ai)      │
                                          └───────────┬──────────┘
                                                      │
                                          ┌───────────▼──────────┐
                                          │  File System         │
                                          │  (agent_workspace/)  │
                                          └──────────────────────┘
```

---

## Diagram 2: Component Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Worker Layer                                │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  WorkerSpawnerAdapter                                       │    │
│  │  - Spawns workers for pending tickets                       │    │
│  │  - Manages worker lifecycle                                 │    │
│  │  - Updates ticket status                                    │    │
│  └────────────────────────┬───────────────────────────────────┘    │
│                           │                                         │
│                           │ spawns                                  │
│                           ▼                                         │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  ClaudeCodeWorker (NEW)                                     │    │
│  │                                                             │    │
│  │  Methods:                                                   │    │
│  │  + executeTicket(ticket: WorkTicket): WorkerResult          │    │
│  │                                                             │    │
│  │  Responsibilities:                                          │    │
│  │  1. Extract post content from ticket.payload                │    │
│  │  2. Call ClaudeCodeSDKManager.queryClaudeCode()             │    │
│  │  3. Parse Claude response                                   │    │
│  │  4. Return WorkerResult                                     │    │
│  └────────────────────────┬───────────────────────────────────┘    │
│                           │                                         │
└───────────────────────────┼─────────────────────────────────────────┘
                            │
                            │ calls
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        SDK Manager Layer                             │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  ClaudeCodeSDKManager (EXISTING)                            │    │
│  │                                                             │    │
│  │  Configuration:                                             │    │
│  │  - workingDirectory: /workspaces/agent-feed/prod            │    │
│  │  - model: claude-sonnet-4-20250514                          │    │
│  │  - permissionMode: bypassPermissions                        │    │
│  │  - allowedTools: [Bash, Read, Write, Edit, Grep, Glob]     │    │
│  │                                                             │    │
│  │  Methods:                                                   │    │
│  │  + queryClaudeCode(prompt, options): Response               │    │
│  │  + createStreamingChat(input, options): Response            │    │
│  │                                                             │    │
│  │  Features:                                                  │    │
│  │  - Streams Claude responses                                 │    │
│  │  - Broadcasts tool activity to SSE                          │    │
│  │  - Handles errors gracefully                                │    │
│  └────────────────────────┬───────────────────────────────────┘    │
└───────────────────────────┼─────────────────────────────────────────┘
                            │
                            │ invokes
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Claude SDK Layer                              │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  @anthropic-ai/claude-code                                  │    │
│  │                                                             │    │
│  │  Available Tools:                                           │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │    │
│  │  │   Read   │  │  Write   │  │   Bash   │  │   Edit   │   │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │    │
│  │  ┌──────────┐  ┌──────────┐                                │    │
│  │  │   Grep   │  │   Glob   │                                │    │
│  │  └──────────┘  └──────────┘                                │    │
│  │                                                             │    │
│  │  Capabilities:                                              │    │
│  │  - Natural language interpretation                          │    │
│  │  - Multi-step operation planning                            │    │
│  │  - Tool execution                                           │    │
│  │  - Error handling                                           │    │
│  └────────────────────────┬───────────────────────────────────┘    │
└───────────────────────────┼─────────────────────────────────────────┘
                            │
                            │ operates on
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     File System Layer                                │
│                                                                      │
│  Agent Workspace: /workspaces/agent-feed/prod/agent_workspace/      │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Security Boundaries:                                        │   │
│  │  ✓ Operations confined to workspace                         │   │
│  │  ✓ No path traversal beyond workspace                       │   │
│  │  ✓ No access to .env, .git, .ssh                            │   │
│  │  ✓ No access to system directories                          │   │
│  │  ✓ All operations logged                                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Diagram 3: Data Flow - Simple Request

```
Request: "Create a test.txt file with 'Hello World'"

┌──────────────┐
│  User Post   │ "Create a test.txt file with 'Hello World'"
└──────┬───────┘
       │
       │ 1. Posted to system
       ▼
┌──────────────────────────┐
│  work_queue (PostgreSQL) │
│  {                       │
│    id: 12345,            │
│    post_content: "...",  │
│    status: "pending"     │
│  }                       │
└──────┬───────────────────┘
       │
       │ 2. Picked up by orchestrator
       ▼
┌───────────────────┐
│  AVI Orchestrator │
└──────┬────────────┘
       │
       │ 3. Spawns worker
       ▼
┌──────────────────┐
│  WorkerSpawner   │
└──────┬───────────┘
       │
       │ 4. Creates ClaudeCodeWorker
       ▼
┌────────────────────────────────────────┐
│  ClaudeCodeWorker                      │
│                                        │
│  ticket.payload.content =              │
│  "Create a test.txt file with          │
│   'Hello World'"                       │
│                                        │
│  ↓ Extract content                     │
│  ↓ NO REGEX PARSING                    │
│  ↓ Pass directly to Claude             │
└────────┬───────────────────────────────┘
         │
         │ 5. Calls SDK
         ▼
┌────────────────────────────────────────┐
│  ClaudeCodeSDKManager.queryClaudeCode()│
│                                        │
│  prompt: "Create a test.txt file       │
│           with 'Hello World'"          │
│                                        │
│  options: {                            │
│    cwd: "/workspaces/agent-feed/       │
│          prod/agent_workspace/",       │
│    model: "claude-sonnet-4",           │
│    permissionMode: "bypassPermissions" │
│  }                                     │
└────────┬───────────────────────────────┘
         │
         │ 6. Invokes Claude
         ▼
┌────────────────────────────────────────┐
│  Claude Code SDK                       │
│                                        │
│  Claude thinks:                        │
│  "User wants to create a file          │
│   named test.txt with the content      │
│   'Hello World'"                       │
│                                        │
│  Claude decides:                       │
│  "I'll use the Write tool"             │
│                                        │
│  Claude executes:                      │
│  Write({                               │
│    file_path: "/workspaces/agent-feed/ │
│               prod/agent_workspace/    │
│               test.txt",               │
│    content: "Hello World"              │
│  })                                    │
└────────┬───────────────────────────────┘
         │
         │ 7. Writes to disk
         ▼
┌────────────────────────────────────────┐
│  File System                           │
│                                        │
│  /workspaces/agent-feed/prod/          │
│  agent_workspace/test.txt              │
│                                        │
│  Content: "Hello World"                │
│  Size: 11 bytes                        │
│  Created: 2025-10-14 14:23:45          │
└────────┬───────────────────────────────┘
         │
         │ 8. Returns success
         ▼
┌────────────────────────────────────────┐
│  Claude Response                       │
│  {                                     │
│    type: "assistant",                  │
│    content: "I've created test.txt     │
│              with the content          │
│              'Hello World'"            │
│  }                                     │
└────────┬───────────────────────────────┘
         │
         │ 9. Formats result
         ▼
┌────────────────────────────────────────┐
│  WorkerResult                          │
│  {                                     │
│    success: true,                      │
│    output: {                           │
│      content: "I've created...",       │
│      filesCreated: ["test.txt"]        │
│    },                                  │
│    tokensUsed: 245,                    │
│    duration: 1823                      │
│  }                                     │
└────────┬───────────────────────────────┘
         │
         │ 10. Updates ticket
         ▼
┌────────────────────────────┐
│  work_queue                │
│  {                         │
│    id: 12345,              │
│    status: "completed",    │
│    result: { ... }         │
│  }                         │
└────────────────────────────┘

Result: test.txt created with "Hello World" ✓
```

---

## Diagram 4: Data Flow - Complex Multi-Step Request

```
Request: "List all files, then create summary.txt with the list"

┌────────────────────────────────────────┐
│  ClaudeCodeWorker                      │
│  Content: "List all files, then create │
│            summary.txt with the list"  │
└────────┬───────────────────────────────┘
         │
         │ Pass to Claude (no parsing)
         ▼
┌────────────────────────────────────────┐
│  Claude Code SDK - Turn 1              │
│                                        │
│  Claude thinks:                        │
│  "User wants me to:                    │
│   1. List files                        │
│   2. Create summary.txt with list"     │
│                                        │
│  Claude decides:                       │
│  "First, I need to list the files"     │
│                                        │
│  Claude executes:                      │
│  Bash({ command: "ls -la" })           │
└────────┬───────────────────────────────┘
         │
         │ Execute command
         ▼
┌────────────────────────────────────────┐
│  File System                           │
│                                        │
│  Executing: ls -la                     │
│                                        │
│  Output:                               │
│  total 24                              │
│  -rw-r--r--  test.txt                  │
│  -rw-r--r--  data.json                 │
│  -rw-r--r--  config.yaml               │
│  -rw-r--r--  notes.md                  │
└────────┬───────────────────────────────┘
         │
         │ Return output to Claude
         ▼
┌────────────────────────────────────────┐
│  Claude Code SDK - Turn 2              │
│                                        │
│  Claude receives:                      │
│  "total 24                             │
│   -rw-r--r--  test.txt                 │
│   -rw-r--r--  data.json                │
│   -rw-r--r--  config.yaml              │
│   -rw-r--r--  notes.md"                │
│                                        │
│  Claude thinks:                        │
│  "Good, I have the file list.          │
│   Now I need to create summary.txt     │
│   with this information"               │
│                                        │
│  Claude executes:                      │
│  Write({                               │
│    file_path: "summary.txt",           │
│    content: "Files in workspace:\n     │
│              - test.txt\n              │
│              - data.json\n             │
│              - config.yaml\n           │
│              - notes.md\n              │
│              \nTotal: 4 files"         │
│  })                                    │
└────────┬───────────────────────────────┘
         │
         │ Write file
         ▼
┌────────────────────────────────────────┐
│  File System                           │
│                                        │
│  Creating: summary.txt                 │
│                                        │
│  Content:                              │
│  "Files in workspace:                  │
│   - test.txt                           │
│   - data.json                          │
│   - config.yaml                        │
│   - notes.md                           │
│                                        │
│   Total: 4 files"                      │
└────────┬───────────────────────────────┘
         │
         │ Return success
         ▼
┌────────────────────────────────────────┐
│  Claude Response                       │
│  {                                     │
│    type: "result",                     │
│    subtype: "success",                 │
│    content: "I've listed the files     │
│              and created summary.txt   │
│              with the list of 4 files",│
│    num_turns: 2,                       │
│    tools_used: ["Bash", "Write"]       │
│  }                                     │
└────────┬───────────────────────────────┘
         │
         │ Format result
         ▼
┌────────────────────────────────────────┐
│  WorkerResult                          │
│  {                                     │
│    success: true,                      │
│    output: {                           │
│      content: "I've listed...",        │
│      filesCreated: ["summary.txt"],    │
│      commandsExecuted: ["ls -la"]      │
│    },                                  │
│    tokensUsed: 478,                    │
│    duration: 3421                      │
│  }                                     │
└────────────────────────────────────────┘

Result: summary.txt created with file list ✓

Key Insight: Claude automatically handled multi-step operation.
             No regex could parse "list then create" correctly.
```

---

## Diagram 5: Comparison - Old vs New System

```
OLD SYSTEM (BROKEN):
═══════════════════

User: "Create a file called test.txt with the text: Hello"

┌──────────────┐
│  User Input  │ "Create a file called test.txt with the text: Hello"
└──────┬───────┘
       │
       ▼
┌────────────────────────────────────────┐
│  TaskTypeDetector (REGEX)              │
│                                        │
│  Patterns:                             │
│  /create\s+(?:a\s+)?file\s+            │
│   (?:called\s+)?["']?([^"'\s]+)["']?/  │
│                                        │
│  Match: "test.txt"  ✓                  │
│                                        │
│  Extract content pattern:              │
│  /with\s+(?:the\s+)?text:\s*           │
│   ["']?([^"']+)["']?/                  │
│                                        │
│  Match: "Hello"  ✗ FAILS               │
│  (Captures "you" and "with" instead)   │
└────────┬───────────────────────────────┘
       │
       │ Broken parameters
       ▼
┌────────────────────────────────────────┐
│  FileOperationExecutor                 │
│                                        │
│  Params:                               │
│  - operation: "create"                 │
│  - path: "you"        ← WRONG          │
│  - content: "with"    ← WRONG          │
└────────┬───────────────────────────────┘
       │
       │ Execute with wrong params
       ▼
┌────────────────────────────────────────┐
│  File System                           │
│                                        │
│  Created:                              │
│  - Folder: "you/"     ← WRONG          │
│  - File: "with"       ← WRONG          │
│                                        │
│  ❌ test.txt NOT created               │
│  ❌ "Hello" NOT written                │
└────────────────────────────────────────┘

Result: Broken - created "you" folder and "with" file ❌


NEW SYSTEM (FIXED):
═══════════════════

User: "Create a file called test.txt with the text: Hello"

┌──────────────┐
│  User Input  │ "Create a file called test.txt with the text: Hello"
└──────┬───────┘
       │
       │ NO PARSING - Pass directly
       ▼
┌────────────────────────────────────────┐
│  ClaudeCodeWorker                      │
│                                        │
│  content = ticket.payload.content      │
│  ↓                                     │
│  ↓ No regex                            │
│  ↓ No pattern matching                 │
│  ↓ No string manipulation              │
│  ↓                                     │
│  Pass to Claude SDK as-is              │
└────────┬───────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────┐
│  Claude Code SDK                       │
│                                        │
│  Claude interprets:                    │
│  "User wants to create a file          │
│   named test.txt with content Hello"   │
│                                        │
│  Claude understands:                   │
│  - Action: create                      │
│  - Target: test.txt                    │
│  - Content: Hello                      │
│                                        │
│  Claude executes:                      │
│  Write({                               │
│    file_path: "test.txt",  ✓           │
│    content: "Hello"        ✓           │
│  })                                    │
└────────┬───────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────┐
│  File System                           │
│                                        │
│  Created:                              │
│  - File: test.txt       ✓              │
│  - Content: "Hello"     ✓              │
│                                        │
│  ✓ Correct file created                │
│  ✓ Correct content written             │
└────────────────────────────────────────┘

Result: Fixed - created test.txt with "Hello" ✓

Key Difference: Claude interprets natural language correctly.
                Regex cannot handle language variations.
```

---

## Diagram 6: Security Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│                      File System Hierarchy                       │
│                                                                  │
│  /                                                               │
│  ├── etc/                     ← ✗ Blocked                        │
│  ├── var/                     ← ✗ Blocked                        │
│  ├── home/                    ← ✗ Blocked                        │
│  │                                                               │
│  └── workspaces/                                                 │
│      └── agent-feed/                                             │
│          ├── .env             ← ✗ Blocked (sensitive)            │
│          ├── .git/            ← ✗ Blocked (sensitive)            │
│          ├── node_modules/    ← ✗ Blocked (outside workspace)   │
│          ├── src/             ← ✗ Blocked (outside workspace)   │
│          │                                                       │
│          └── prod/                                               │
│              ├── .env         ← ✗ Blocked (sensitive)            │
│              │                                                   │
│              └── agent_workspace/  ← ✓ ALLOWED WORKSPACE         │
│                  │                                               │
│                  ├── *.txt    ← ✓ Allowed                        │
│                  ├── *.json   ← ✓ Allowed                        │
│                  ├── *.md     ← ✓ Allowed                        │
│                  ├── *.yaml   ← ✓ Allowed                        │
│                  │                                               │
│                  ├── .env     ← ✗ Blocked (sensitive pattern)   │
│                  ├── .git/    ← ✗ Blocked (sensitive pattern)   │
│                  └── .ssh/    ← ✗ Blocked (sensitive pattern)   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

Security Enforcement:
┌─────────────────────────────────────────────────────────────────┐
│  Layer 1: Claude Code SDK (Primary)                             │
│  - Enforces cwd: /workspaces/agent-feed/prod/agent_workspace/   │
│  - Rejects operations outside cwd                               │
│  - Blocks sensitive file patterns (.env, .git, .ssh)            │
│  - No manual validation needed                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Layer 2: Permission Mode                                       │
│  - permissionMode: "bypassPermissions"                          │
│  - Allows automated operations (no human approval)              │
│  - Still enforces workspace boundaries                          │
│  - All operations logged                                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Layer 3: Logging & Audit                                       │
│  - All tool executions logged                                   │
│  - All file operations tracked                                  │
│  - Broadcast to SSE for real-time monitoring                    │
│  - Audit trail maintained                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Diagram 7: Error Handling Flow

```
┌────────────────────────────────────────┐
│  ClaudeCodeWorker.executeTicket()      │
└────────┬───────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│  Try Block                             │
│  {                                     │
│    Extract content                     │
│    Call Claude SDK                     │
│    Parse response                      │
│    Return success result               │
│  }                                     │
└────────┬───────────────────────────────┘
         │
         │ Error?
         ├─────────────────────────────┐
         │                             │
         │ No error                    │ Error detected
         ▼                             ▼
┌──────────────────────┐    ┌──────────────────────────────────┐
│  Success Path        │    │  Error Path                      │
│                      │    │                                  │
│  return {            │    │  Categorize error:               │
│    success: true,    │    │  ├─ SDK error                    │
│    output: {...},    │    │  ├─ Timeout                      │
│    tokensUsed: 245,  │    │  ├─ Validation error             │
│    duration: 1823    │    │  └─ Unknown error                │
│  }                   │    │                                  │
└──────┬───────────────┘    └──────────┬───────────────────────┘
       │                               │
       │                               ▼
       │                    ┌──────────────────────────────────┐
       │                    │  Log error details:              │
       │                    │  - Error message                 │
       │                    │  - Error category                │
       │                    │  - Ticket ID                     │
       │                    │  - User ID                       │
       │                    │  - Stack trace                   │
       │                    └──────────┬───────────────────────┘
       │                               │
       │                               ▼
       │                    ┌──────────────────────────────────┐
       │                    │  return {                        │
       │                    │    success: false,               │
       │                    │    error: Error(...),            │
       │                    │    errorCategory: 'sdk',         │
       │                    │    tokensUsed: 0,                │
       │                    │    duration: 1234                │
       │                    │  }                               │
       │                    └──────────┬───────────────────────┘
       │                               │
       └───────────────┬───────────────┘
                       │
                       ▼
┌────────────────────────────────────────┐
│  WorkerSpawner                         │
│  - Receives result (success or error)  │
│  - Updates work_queue ticket status    │
│  - Logs completion                     │
└────────┬───────────────────────────────┘
         │
         ├─────────────────────────────┐
         │                             │
         │ Success                     │ Failure
         ▼                             ▼
┌──────────────────────┐    ┌──────────────────────┐
│  completeTicket()    │    │  failTicket()        │
│  - status: completed │    │  - status: failed    │
│  - result: {...}     │    │  - error: "..."      │
└──────────────────────┘    └──────────────────────┘


Error Categories & Handling:
═══════════════════════════

1. SDK Errors (Claude API issues)
   ├─ Rate limit (429)
   │  └─ Retry: No (mark as failed, requeue later)
   ├─ Server error (500)
   │  └─ Retry: No (mark as failed)
   └─ Authentication error
      └─ Retry: No (critical, alert ops)

2. Timeout Errors (60 second limit)
   ├─ Worker timeout reached
   │  └─ Retry: No (mark as failed)
   └─ Claude SDK timeout
      └─ Retry: No (mark as failed)

3. Validation Errors (workspace boundaries)
   ├─ Path traversal attempt
   │  └─ Retry: No (mark as failed, log security event)
   ├─ Sensitive file access
   │  └─ Retry: No (mark as failed, log security event)
   └─ Invalid workspace path
      └─ Retry: No (mark as failed)

4. Tool Execution Errors (file operations)
   ├─ File not found
   │  └─ Retry: No (mark as failed, Claude explains error)
   ├─ Permission denied
   │  └─ Retry: No (mark as failed, Claude explains error)
   └─ Disk full
      └─ Retry: No (mark as failed, alert ops)
```

---

## Diagram 8: Monitoring & Observability

```
┌─────────────────────────────────────────────────────────────────┐
│                    Monitoring Architecture                       │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Tool Execution Events                                  │    │
│  │  (Broadcast to SSE)                                     │    │
│  │                                                         │    │
│  │  Event: {                                               │    │
│  │    type: "tool_activity",                               │    │
│  │    data: {                                              │    │
│  │      tool: "Read",                                      │    │
│  │      action: "test.txt",                                │    │
│  │      priority: "high",                                  │    │
│  │      timestamp: 1697123456789                           │    │
│  │    }                                                    │    │
│  │  }                                                      │    │
│  └────────┬───────────────────────────────────────────────┘    │
│           │                                                     │
│           │ Broadcast via SSE                                  │
│           ▼                                                     │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Frontend Ticker                                        │    │
│  │  ┌──────────────────────────────────────────────────┐  │    │
│  │  │  📖 Read(test.txt)                               │  │    │
│  │  │  ✏️  Write(summary.txt)                           │  │    │
│  │  │  💻 Bash(ls -la)                                  │  │    │
│  │  │  🔍 Grep(pattern: "TODO")                         │  │    │
│  │  └──────────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      Performance Metrics                         │
│                                                                  │
│  ┌───────────────────┐  ┌───────────────────┐                  │
│  │  Duration         │  │  Success Rate     │                  │
│  │  Avg: 2.3s        │  │  95.2%            │                  │
│  │  p95: 8.7s        │  │  ──────────       │                  │
│  │  p99: 14.2s       │  │  Target: >90%     │                  │
│  └───────────────────┘  └───────────────────┘                  │
│                                                                  │
│  ┌───────────────────┐  ┌───────────────────┐                  │
│  │  Token Usage      │  │  Timeout Rate     │                  │
│  │  Avg: 324 tokens  │  │  1.3%             │                  │
│  │  Total: 45.2k     │  │  ──────────       │                  │
│  │  Cost: $2.31      │  │  Target: <2%      │                  │
│  └───────────────────┘  └───────────────────┘                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      Error Tracking                              │
│                                                                  │
│  Error Rate by Category:                                        │
│  ┌──────────────────────────────────────────────────────┐      │
│  │  SDK Errors:         2.1%  [Rate limit, Server error]│      │
│  │  Timeout Errors:     1.3%  [Worker timeout]          │      │
│  │  Validation Errors:  0.5%  [Path traversal]          │      │
│  │  Tool Errors:        0.9%  [File not found]          │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                  │
│  Recent Errors:                                                 │
│  ┌──────────────────────────────────────────────────────┐      │
│  │  [14:23:45] Timeout: Ticket #12345                   │      │
│  │  [14:18:32] SDK Error: Rate limit (429)              │      │
│  │  [14:12:18] Validation: Path traversal blocked       │      │
│  └──────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Diagram 9: Deployment Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    Gradual Rollout Strategy                      │
│                                                                  │
│  Phase 1: 10% Traffic (24 hours)                                │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  UnifiedAgentWorker (90%)  ████████████████████████    │    │
│  │  ClaudeCodeWorker (10%)    ██                          │    │
│  │                                                         │    │
│  │  Monitor:                                               │    │
│  │  ✓ Success rate > 85%                                   │    │
│  │  ✓ No security violations                               │    │
│  │  ✓ Performance acceptable                               │    │
│  └────────────────────────────────────────────────────────┘    │
│                           │                                     │
│                           │ Metrics OK?                         │
│                           ▼                                     │
│  Phase 2: 50% Traffic (48 hours)                                │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  UnifiedAgentWorker (50%)  ████████████                │    │
│  │  ClaudeCodeWorker (50%)    ████████████                │    │
│  │                                                         │    │
│  │  Monitor:                                               │    │
│  │  ✓ Success rate > 90%                                   │    │
│  │  ✓ Performance stable                                   │    │
│  │  ✓ User feedback positive                               │    │
│  └────────────────────────────────────────────────────────┘    │
│                           │                                     │
│                           │ Metrics OK?                         │
│                           ▼                                     │
│  Phase 3: 100% Traffic (Production)                             │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  UnifiedAgentWorker (0%)                               │    │
│  │  ClaudeCodeWorker (100%)   ████████████████████████    │    │
│  │                                                         │    │
│  │  Deprecate old system:                                  │    │
│  │  ✓ Remove TaskTypeDetector                              │    │
│  │  ✓ Remove FileOperationExecutor                         │    │
│  │  ✓ Update documentation                                 │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

Rollback Procedure:
┌─────────────────────────────────────────────────────────────────┐
│  If critical issues detected at any phase:                      │
│                                                                  │
│  1. Revert WorkerSpawner to use UnifiedAgentWorker              │
│     (1 line change)                                             │
│                                                                  │
│  2. Deploy immediately                                          │
│     (< 5 minutes rollback time)                                 │
│                                                                  │
│  3. Investigate issues                                          │
│                                                                  │
│  4. Fix and retry rollout                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Diagram 10: Integration Testing Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                     Test Pyramid                                 │
│                                                                  │
│                         ▲                                        │
│                        ╱ ╲                                       │
│                       ╱   ╲                                      │
│                      ╱ E2E ╲                                     │
│                     ╱  10%  ╲                                    │
│                    ╱─────────╲                                   │
│                   ╱           ╲                                  │
│                  ╱ Integration ╲                                 │
│                 ╱      30%      ╲                                │
│                ╱─────────────────╲                               │
│               ╱                   ╲                              │
│              ╱       Unit          ╲                             │
│             ╱        60%            ╲                            │
│            ╱─────────────────────────╲                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

Unit Tests (60%):
┌─────────────────────────────────────────────────────────────────┐
│  ClaudeCodeWorker Tests                                         │
│  ├─ executeTicket() extracts content correctly                  │
│  ├─ executeTicket() calls Claude SDK with right params          │
│  ├─ executeTicket() returns WorkerResult on success             │
│  ├─ executeTicket() returns error on Claude SDK failure         │
│  ├─ executeTicket() enforces timeout                            │
│  ├─ executeTicket() categorizes errors correctly                │
│  └─ executeTicket() logs execution details                      │
│                                                                  │
│  Coverage Target: 80%+                                          │
└─────────────────────────────────────────────────────────────────┘

Integration Tests (30%):
┌─────────────────────────────────────────────────────────────────┐
│  End-to-End WorkTicket Processing                               │
│  ├─ Creates file from natural language                          │
│  ├─ Handles multi-step operations (list + create)               │
│  ├─ Rejects operations outside workspace                        │
│  ├─ Blocks sensitive file operations                            │
│  ├─ Updates work_queue status correctly                         │
│  └─ Broadcasts tool activity to SSE                             │
│                                                                  │
│  Regression Tests (vs TaskTypeDetector)                         │
│  ├─ "Create file called test.txt" → test.txt (not "you")       │
│  ├─ "Make notes.md" → notes.md (correct)                        │
│  └─ Complex requests work (old system failed)                   │
│                                                                  │
│  Coverage Target: 70%+                                          │
└─────────────────────────────────────────────────────────────────┘

E2E Tests (10%):
┌─────────────────────────────────────────────────────────────────┐
│  Full System Tests                                              │
│  ├─ User posts → work_queue → worker → result → database       │
│  ├─ Security: Path traversal blocked end-to-end                 │
│  ├─ Performance: Simple operations < 5 seconds                  │
│  ├─ Performance: Complex operations < 15 seconds                │
│  └─ Monitoring: Tool activity visible in frontend               │
│                                                                  │
│  Coverage Target: 50%+ (critical paths only)                    │
└─────────────────────────────────────────────────────────────────┘
```

---

**End of Architecture Diagrams**

These diagrams provide comprehensive visual representation of:
- System architecture
- Data flows
- Security boundaries
- Error handling
- Monitoring strategy
- Deployment approach
- Testing strategy

For implementation details, refer to the main specification:
`/workspaces/agent-feed/api-server/docs/SPARC-ClaudeCode-Integration-Spec.md`

