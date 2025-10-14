# Claude Code Worker Integration Architecture

**Document Version:** 1.0
**Date:** 2025-10-14
**Status:** Design Phase
**Owner:** Architecture Team

---

## Executive Summary

This document describes the architecture for integrating the official Claude Code SDK (`@anthropic-ai/claude-code`) into the AVI worker system. The integration replaces the existing `UnifiedAgentWorker` with a new `ClaudeCodeWorker` that delegates all natural language interpretation, tool usage, and file operations to Claude directly.

### Key Benefits

1. **No regex parsing** - Claude handles all natural language interpretation
2. **Native tool access** - Claude can directly use Read, Write, Edit, Bash, Grep, Glob tools
3. **Better reasoning** - Claude's native intelligence replaces brittle pattern matching
4. **Workspace safety** - Built-in sandbox restrictions to `/workspaces/agent-feed/prod/agent_workspace/`
5. **Token tracking** - Full integration with existing TokenAnalyticsWriter
6. **SSE streaming** - Real-time activity broadcasts via existing broadcastToolActivity infrastructure

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Component Design](#2-component-design)
3. [API Integration Patterns](#3-api-integration-patterns)
4. [Data Flow Architecture](#4-data-flow-architecture)
5. [Error Handling Strategy](#5-error-handling-strategy)
6. [Security Model](#6-security-model)
7. [Performance Considerations](#7-performance-considerations)
8. [Integration Patterns](#8-integration-patterns)
9. [Migration Strategy](#9-migration-strategy)
10. [Appendix](#10-appendix)

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        AVI Orchestrator                                 │
│  (Unchanged - implements IWorkerSpawner interface)                      │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             │ spawnWorker(ticket)
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   WorkerSpawnerAdapter                                  │
│  - Implements IWorkerSpawner                                            │
│  - Spawns ClaudeCodeWorker instances                                    │
│  - Tracks worker lifecycle                                              │
│  - Updates work queue status                                            │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             │ new ClaudeCodeWorker(db)
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      ClaudeCodeWorker                                   │
│  [NEW - Replaces UnifiedAgentWorker]                                    │
│                                                                          │
│  + executeTicket(ticket): Promise<WorkerResult>                         │
│  - prepareClaudePrompt(ticket): string                                  │
│  - executeClaudeCode(prompt, options): Promise<ClaudeResponse>          │
│  - extractResult(response): WorkerResult                                │
│  - handleTimeout(duration): Promise<WorkerResult>                       │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             │ HTTP POST /api/claude-code/streaming-chat
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              Claude Code SDK API Endpoint                               │
│              /api/claude-code/streaming-chat                            │
│                                                                          │
│  - Receives: { message, options }                                       │
│  - Delegates to ClaudeCodeSDKManager                                    │
│  - Streams responses                                                    │
│  - Broadcasts tool activity to SSE                                      │
│  - Tracks token usage                                                   │
│  - Returns: { success, message, responses, toolsEnabled }               │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             │ createStreamingChat(message, options)
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   ClaudeCodeSDKManager                                  │
│                   (Singleton Service)                                   │
│                                                                          │
│  - Manages @anthropic-ai/claude-code SDK                                │
│  - workingDirectory: /workspaces/agent-feed/prod                        │
│  - allowedTools: [Read, Write, Edit, Bash, Grep, Glob, etc.]           │
│  - permissionMode: bypassPermissions                                    │
│  - Broadcasts tool executions to SSE                                    │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             │ query({ prompt, options })
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              @anthropic-ai/claude-code SDK                              │
│                                                                          │
│  - Native Claude Code implementation                                    │
│  - Tool execution (Read, Write, Edit, Bash, Grep, Glob)                │
│  - File system operations                                               │
│  - Shell command execution                                              │
│  - Workspace sandboxing                                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Component Interaction Diagram

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────────┐
│  Orchestrator│──────▶│ WorkerSpawner    │──────▶│ ClaudeCodeWorker │
└──────────────┘       │  Adapter         │       └──────────────────┘
                       └──────────────────┘              │
                              │                          │
                              │                          │ HTTP API Call
                              │                          ▼
                              │                   ┌──────────────────┐
                              │                   │ Claude Code SDK  │
                              │                   │    API Route     │
                              │                   └──────────────────┘
                              │                          │
                              │                          │
                              │                          ▼
                              │                   ┌──────────────────┐
                              │                   │ ClaudeCodeSDK    │
                              │                   │    Manager       │
                              │                   └──────────────────┘
                              │                          │
                              │                          │
                              │                          ▼
                              │                   ┌──────────────────┐
                              │                   │ @anthropic-ai/   │
                              │                   │  claude-code     │
                              │                   └──────────────────┘
                              │                          │
                              │                          │ Tool Execution
                              │                          ▼
                              │                   ┌──────────────────┐
                              │                   │  File System     │
                              │                   │  /workspaces/    │
                              │                   │  agent-feed/prod/│
                              │                   └──────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │ Work Queue       │
                       │ Repository       │
                       │ (PostgreSQL)     │
                       └──────────────────┘
```

---

## 2. Component Design

### 2.1 ClaudeCodeWorker Class

#### 2.1.1 Class Definition

```typescript
/**
 * ClaudeCodeWorker - Claude Code SDK-powered worker
 *
 * Replaces UnifiedAgentWorker with full Claude Code integration.
 * Delegates all natural language interpretation and tool usage to Claude.
 *
 * @implements IWorker interface (compatible with existing system)
 */
export class ClaudeCodeWorker {
  private db: DatabaseManager;
  private apiBaseUrl: string;
  private timeout: number;
  private workspaceRoot: string;

  constructor(db: DatabaseManager, options?: ClaudeCodeWorkerOptions);

  /**
   * Execute work ticket (main entry point)
   * @implements IWorker.executeTicket
   */
  async executeTicket(ticket: WorkTicket): Promise<WorkerResult>;

  /**
   * Prepare Claude-friendly prompt from ticket
   */
  private prepareClaudePrompt(ticket: WorkTicket): string;

  /**
   * Execute Claude Code via streaming-chat API
   */
  private async executeClaudeCode(
    prompt: string,
    options: ClaudeCodeOptions
  ): Promise<ClaudeCodeResponse>;

  /**
   * Extract WorkerResult from Claude response
   */
  private extractResult(
    response: ClaudeCodeResponse,
    startTime: number
  ): WorkerResult;

  /**
   * Handle timeout scenarios
   */
  private async handleTimeout(duration: number): Promise<WorkerResult>;

  /**
   * Extract token usage from response
   */
  private extractTokenUsage(response: ClaudeCodeResponse): number;
}
```

#### 2.1.2 Interface Definition

```typescript
/**
 * Worker options
 */
interface ClaudeCodeWorkerOptions {
  /** API base URL (default: http://localhost:3000) */
  apiBaseUrl?: string;

  /** Execution timeout in milliseconds (default: 120000) */
  timeout?: number;

  /** Workspace root path (default: /workspaces/agent-feed/prod/agent_workspace) */
  workspaceRoot?: string;

  /** Whether to enable streaming mode (default: true) */
  streaming?: boolean;
}

/**
 * Claude Code API request
 */
interface ClaudeCodeRequest {
  message: string;
  options?: {
    sessionId?: string;
    cwd?: string;
    model?: string;
    allowedTools?: string[];
    maxTurns?: number;
  };
}

/**
 * Claude Code API response
 */
interface ClaudeCodeResponse {
  success: boolean;
  message?: string;
  responses?: Array<{
    type: string;
    content?: string;
    message?: any;
    messages?: any[];
  }>;
  timestamp?: string;
  claudeCode?: boolean;
  toolsEnabled?: boolean;
  error?: string;
  details?: string;
}
```

### 2.2 Prompt Engineering Strategy

#### 2.2.1 Prompt Template

The worker constructs prompts that guide Claude to:
1. Understand the user's request from the ticket content
2. Use appropriate tools (Read, Write, Edit, Bash, etc.)
3. Work within the workspace constraints
4. Return a clear result summary

```typescript
private prepareClaudePrompt(ticket: WorkTicket): string {
  const content = ticket.payload.content || '';
  const metadata = ticket.payload.metadata || {};

  return `
You are an AI agent worker processing a user request.

USER REQUEST:
${content}

METADATA:
${JSON.stringify(metadata, null, 2)}

WORKSPACE:
You are working in: /workspaces/agent-feed/prod/agent_workspace/
All file operations MUST be within this workspace.

YOUR TASK:
1. Interpret the user's request
2. Execute the necessary operations using available tools:
   - Use Read tool to read files
   - Use Write tool to create new files
   - Use Edit tool to modify existing files
   - Use Bash tool to execute shell commands
   - Use Grep/Glob tools to search for files/content
3. Return a clear summary of what you accomplished

CONSTRAINTS:
- Stay within workspace boundaries
- Don't execute destructive operations without clear intent
- Return a concise summary of the result

Please proceed with the request.
`.trim();
}
```

#### 2.2.2 Prompt Variations

Different ticket types may require different prompt structures:

**File Operation Request:**
```
User wants to: create file test.txt with content "Hello World"
Workspace: /workspaces/agent-feed/prod/agent_workspace/
Action: Use Write tool to create the file at the specified path
```

**RSS Feed Processing:**
```
User wants to: process RSS feed item and generate a response
Feed Content: [content]
Action: Analyze the content and generate an appropriate response
```

**Command Execution:**
```
User wants to: run command "npm test"
Workspace: /workspaces/agent-feed/prod/agent_workspace/
Action: Use Bash tool to execute the command safely
```

---

## 3. API Integration Patterns

### 3.1 HTTP Client Implementation

```typescript
/**
 * Execute Claude Code via streaming-chat API
 */
private async executeClaudeCode(
  prompt: string,
  options: ClaudeCodeOptions
): Promise<ClaudeCodeResponse> {
  const sessionId = options.sessionId || `worker_${Date.now()}_${crypto.randomUUID()}`;

  const requestBody: ClaudeCodeRequest = {
    message: prompt,
    options: {
      sessionId: sessionId,
      cwd: this.workspaceRoot,
      model: 'claude-sonnet-4-20250514',
      allowedTools: [
        'Bash',
        'Read',
        'Write',
        'Edit',
        'Grep',
        'Glob',
        'WebFetch',
        'WebSearch'
      ],
      maxTurns: 10
    }
  };

  try {
    const response = await fetch(`${this.apiBaseUrl}/api/claude-code/streaming-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: ClaudeCodeResponse = await response.json();

    if (!data.success) {
      throw new Error(data.error || data.details || 'Unknown error');
    }

    return data;

  } catch (error) {
    logger.error('Claude Code API call failed', {
      error: error instanceof Error ? error.message : String(error),
      prompt: prompt.substring(0, 100)
    });

    throw error;
  }
}
```

### 3.2 Timeout Handling

```typescript
/**
 * Execute with timeout wrapper
 */
async executeTicket(ticket: WorkTicket): Promise<WorkerResult> {
  const startTime = Date.now();

  try {
    logger.info('ClaudeCodeWorker executing ticket', {
      ticketId: ticket.id,
      userId: ticket.userId,
      timeout: this.timeout
    });

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Execution timeout after ${this.timeout}ms`));
      }, this.timeout);
    });

    // Create execution promise
    const prompt = this.prepareClaudePrompt(ticket);
    const executionPromise = this.executeClaudeCode(prompt, {
      sessionId: `ticket_${ticket.id}_${Date.now()}`
    });

    // Race between execution and timeout
    const response = await Promise.race([
      executionPromise,
      timeoutPromise
    ]) as ClaudeCodeResponse;

    // Extract result from response
    return this.extractResult(response, startTime);

  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('Ticket execution failed', {
      ticketId: ticket.id,
      error: error instanceof Error ? error.message : String(error),
      duration
    });

    // Check if timeout error
    if (error instanceof Error && error.message.includes('timeout')) {
      return this.handleTimeout(duration);
    }

    return {
      success: false,
      error: error as Error,
      tokensUsed: 0,
      duration
    };
  }
}
```

### 3.3 Response Parsing Strategy

```typescript
/**
 * Extract WorkerResult from Claude Code response
 */
private extractResult(
  response: ClaudeCodeResponse,
  startTime: number
): WorkerResult {
  const duration = Date.now() - startTime;

  // Extract final message content
  let outputMessage = response.message || 'No response content';

  // Try to extract from responses array if available
  if (response.responses && response.responses.length > 0) {
    const lastResponse = response.responses[response.responses.length - 1];

    if (lastResponse.content) {
      outputMessage = lastResponse.content;
    } else if (lastResponse.message) {
      outputMessage = String(lastResponse.message);
    }
  }

  // Extract token usage
  const tokensUsed = this.extractTokenUsage(response);

  logger.info('ClaudeCodeWorker execution completed', {
    success: response.success,
    duration,
    tokensUsed,
    outputLength: outputMessage.length
  });

  return {
    success: response.success,
    output: outputMessage,
    tokensUsed: tokensUsed,
    duration: duration
  };
}

/**
 * Extract token usage from response messages
 */
private extractTokenUsage(response: ClaudeCodeResponse): number {
  if (!response.responses || response.responses.length === 0) {
    return 0;
  }

  let totalTokens = 0;

  // Iterate through all messages looking for usage metadata
  for (const resp of response.responses) {
    if (resp.messages) {
      for (const msg of resp.messages) {
        // Look for result type with token information
        if (msg.type === 'result' && msg.usage) {
          totalTokens += msg.usage.input_tokens || 0;
          totalTokens += msg.usage.output_tokens || 0;
        }
      }
    }
  }

  return totalTokens;
}
```

---

## 4. Data Flow Architecture

### 4.1 Complete Request Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: Orchestrator → WorkerSpawner                                   │
└──────────────────────────────────────────────────────────────────────────┘

Orchestrator.run()
  ├─ polls work queue for pending tickets
  ├─ finds ticket with id=123, content="create file test.txt"
  └─ calls: workerSpawner.spawnWorker(ticket)

┌──────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: WorkerSpawner → ClaudeCodeWorker                               │
└──────────────────────────────────────────────────────────────────────────┘

WorkerSpawnerAdapter.spawnWorker(ticket)
  ├─ generates workerId = "worker-1728932045123-1"
  ├─ creates WorkerInfo { id, ticketId, status: "spawning" }
  ├─ updates work queue: startProcessing(ticketId)
  ├─ creates: worker = new ClaudeCodeWorker(db)
  └─ calls: worker.executeTicket(ticket)

┌──────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: ClaudeCodeWorker → Claude Code API                             │
└──────────────────────────────────────────────────────────────────────────┘

ClaudeCodeWorker.executeTicket(ticket)
  ├─ prepares prompt:
  │   "User wants to: create file test.txt with content 'Hello World'"
  │   "Workspace: /workspaces/agent-feed/prod/agent_workspace/"
  │   "Use Write tool to create the file"
  │
  ├─ calls: executeClaudeCode(prompt, options)
  │   ├─ creates request: {
  │   │   message: prompt,
  │   │   options: {
  │   │     sessionId: "ticket_123_1728932045123",
  │   │     cwd: "/workspaces/agent-feed/prod/agent_workspace",
  │   │     allowedTools: ["Read", "Write", "Edit", "Bash", ...]
  │   │   }
  │   │ }
  │   │
  │   └─ HTTP POST /api/claude-code/streaming-chat
  │       Body: request
  │       Timeout: 120000ms

┌──────────────────────────────────────────────────────────────────────────┐
│ PHASE 4: API Route → ClaudeCodeSDKManager                               │
└──────────────────────────────────────────────────────────────────────────┘

POST /api/claude-code/streaming-chat
  ├─ validates request body
  ├─ broadcasts SSE: "tool_activity: thinking - processing your request"
  ├─ gets singleton: claudeCodeManager = getClaudeCodeSDKManager()
  │
  └─ calls: claudeCodeManager.createStreamingChat(message, options)
      ├─ calls: queryClaudeCode(prompt, options)
      │   ├─ configures query options:
      │   │   { cwd, model, permissionMode: "bypassPermissions" }
      │   │
      │   └─ calls SDK: query({ prompt, options })

┌──────────────────────────────────────────────────────────────────────────┐
│ PHASE 5: Claude Code SDK Execution                                      │
└──────────────────────────────────────────────────────────────────────────┘

@anthropic-ai/claude-code SDK
  ├─ interprets prompt: "create file test.txt"
  ├─ decides to use Write tool
  ├─ broadcasts: tool_activity: "Write - test.txt"
  ├─ executes: Write tool with:
  │   {
  │     file_path: "/workspaces/agent-feed/prod/agent_workspace/test.txt",
  │     content: "Hello World"
  │   }
  │
  ├─ file system operation completes
  ├─ returns message stream:
  │   [
  │     { type: "system", cwd: "...", model: "..." },
  │     { type: "assistant", content: [{ type: "tool_use", name: "Write" }] },
  │     { type: "result", result: "Created file test.txt successfully" }
  │   ]
  │
  └─ queryClaudeCode() collects all messages

┌──────────────────────────────────────────────────────────────────────────┐
│ PHASE 6: Response Propagation                                           │
└──────────────────────────────────────────────────────────────────────────┘

ClaudeCodeSDKManager.createStreamingChat()
  └─ returns: [{
      type: "assistant",
      content: "Created file test.txt successfully",
      messages: [...],
      claudeCode: true
    }]

API Route handler
  ├─ writes token analytics (async, non-blocking)
  ├─ broadcasts SSE: "execution_complete"
  └─ responds: {
      success: true,
      message: "Created file test.txt successfully",
      responses: [...],
      claudeCode: true
    }

ClaudeCodeWorker.extractResult(response)
  └─ returns WorkerResult: {
      success: true,
      output: "Created file test.txt successfully",
      tokensUsed: 1234,
      duration: 2500
    }

┌──────────────────────────────────────────────────────────────────────────┐
│ PHASE 7: Status Updates                                                 │
└──────────────────────────────────────────────────────────────────────────┘

WorkerSpawnerAdapter.executeWorker()
  ├─ updates WorkerInfo: { status: "completed", endTime: Date }
  ├─ updates work queue: completeTicket(ticketId, result)
  ├─ removes from activeWorkers map
  └─ orchestrator continues polling
```

### 4.2 Sequence Diagram

```
User Post → AVI → WorkerSpawner → ClaudeCodeWorker → API → SDKManager → SDK → FileSystem
   │         │          │                  │            │        │         │        │
   │         │          │                  │            │        │         │        │
   │         │─poll────▶│                  │            │        │         │        │
   │         │          │                  │            │        │         │        │
   │         │◀─ticket──│                  │            │        │         │        │
   │         │          │                  │            │        │         │        │
   │         │─spawn───▶│                  │            │        │         │        │
   │         │          │                  │            │        │         │        │
   │         │          │─new Worker──────▶│            │        │         │        │
   │         │          │                  │            │        │         │        │
   │         │          │                  │─prepare────│        │         │        │
   │         │          │                  │  prompt    │        │         │        │
   │         │          │                  │            │        │         │        │
   │         │          │                  │─POST───────▶        │         │        │
   │         │          │                  │ /streaming-chat     │         │        │
   │         │          │                  │            │        │         │        │
   │         │          │                  │            │─create─▶         │        │
   │         │          │                  │            │ chat   │         │        │
   │         │          │                  │            │        │         │        │
   │         │          │                  │            │        │─query──▶         │
   │         │          │                  │            │        │         │        │
   │         │          │                  │            │        │         │─Write─▶│
   │         │          │                  │            │        │         │ tool   │
   │         │          │                  │            │        │         │        │
   │         │          │                  │            │        │         │◀──OK───│
   │         │          │                  │            │        │         │        │
   │         │          │                  │            │        │◀messages─│        │
   │         │          │                  │            │        │         │        │
   │         │          │                  │            │◀response─│        │        │
   │         │          │                  │            │        │         │        │
   │         │          │                  │◀─result────│        │         │        │
   │         │          │                  │            │        │         │        │
   │         │          │◀─WorkerResult────│            │        │         │        │
   │         │          │                  │            │        │         │        │
   │         │◀complete─│                  │            │        │         │        │
   │         │          │                  │            │        │         │        │
```

---

## 5. Error Handling Strategy

### 5.1 Error Categories

```typescript
enum ErrorCategory {
  TIMEOUT = 'TIMEOUT',
  API_ERROR = 'API_ERROR',
  SDK_ERROR = 'SDK_ERROR',
  WORKSPACE_ERROR = 'WORKSPACE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

interface WorkerError extends Error {
  category: ErrorCategory;
  ticketId: string;
  retryable: boolean;
  context?: Record<string, any>;
}
```

### 5.2 Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Error Handling Flow                            │
└─────────────────────────────────────────────────────────────────────┘

executeTicket() throws error
       │
       ├─ Is timeout?
       │    YES ──▶ handleTimeout()
       │             ├─ Log: "Execution timeout"
       │             ├─ Return: WorkerResult { success: false, error }
       │             └─ Mark ticket as failed
       │
       ├─ Is API error (4xx/5xx)?
       │    YES ──▶ handleApiError()
       │             ├─ Log: "API error", status, details
       │             ├─ Determine retryable (5xx = yes, 4xx = no)
       │             └─ Return: WorkerResult with retry flag
       │
       ├─ Is SDK error?
       │    YES ──▶ handleSdkError()
       │             ├─ Log: "SDK error", error details
       │             ├─ Check if permission/workspace issue
       │             └─ Return: WorkerResult with category
       │
       ├─ Is workspace violation?
       │    YES ──▶ handleWorkspaceError()
       │             ├─ Log: "Workspace violation", attempted path
       │             ├─ Alert security
       │             └─ Return: WorkerResult { success: false }
       │
       └─ Unknown error
            └──▶ handleUnknownError()
                  ├─ Log: Full error + stack trace
                  ├─ Alert monitoring
                  └─ Return: WorkerResult { success: false }
```

### 5.3 Error Handling Implementation

```typescript
/**
 * Categorize and handle errors
 */
private handleError(
  error: unknown,
  ticket: WorkTicket,
  duration: number
): WorkerResult {

  // Timeout errors
  if (error instanceof Error && error.message.includes('timeout')) {
    logger.error('Worker timeout', {
      ticketId: ticket.id,
      duration,
      timeout: this.timeout
    });

    return {
      success: false,
      error: new Error(`Worker execution timeout after ${this.timeout}ms`),
      tokensUsed: 0,
      duration,
      retryable: false
    };
  }

  // API errors (HTTP errors)
  if (error instanceof Error && error.message.match(/HTTP \d+/)) {
    const statusMatch = error.message.match(/HTTP (\d+)/);
    const status = statusMatch ? parseInt(statusMatch[1]) : 0;

    logger.error('API error', {
      ticketId: ticket.id,
      status,
      error: error.message
    });

    return {
      success: false,
      error: error,
      tokensUsed: 0,
      duration,
      retryable: status >= 500 // Retry on 5xx errors
    };
  }

  // Workspace violations
  if (error instanceof Error && error.message.includes('workspace')) {
    logger.error('Workspace violation', {
      ticketId: ticket.id,
      error: error.message
    });

    // Alert security monitoring
    this.alertSecurityViolation(ticket, error);

    return {
      success: false,
      error: new Error('Workspace access violation'),
      tokensUsed: 0,
      duration,
      retryable: false
    };
  }

  // Unknown errors
  logger.error('Unknown worker error', {
    ticketId: ticket.id,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
  });

  return {
    success: false,
    error: error instanceof Error ? error : new Error(String(error)),
    tokensUsed: 0,
    duration,
    retryable: false
  };
}
```

### 5.4 Retry Strategy

```typescript
/**
 * Retry logic for retryable errors
 */
async executeWithRetry(
  ticket: WorkTicket,
  maxRetries: number = 3
): Promise<WorkerResult> {

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info('Worker execution attempt', {
        ticketId: ticket.id,
        attempt,
        maxRetries
      });

      const result = await this.executeTicket(ticket);

      // Success or non-retryable failure
      if (result.success || !result.retryable) {
        return result;
      }

      // Retryable failure
      lastError = result.error;

      // Exponential backoff
      const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      await this.delay(delayMs);

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.warn('Worker execution attempt failed', {
        ticketId: ticket.id,
        attempt,
        error: lastError.message
      });
    }
  }

  // All retries exhausted
  return {
    success: false,
    error: lastError || new Error('All retries exhausted'),
    tokensUsed: 0,
    duration: 0
  };
}
```

---

## 6. Security Model

### 6.1 Security Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Security Layers                             │
└─────────────────────────────────────────────────────────────────────┘

Layer 1: Workspace Sandboxing
  ├─ Claude Code SDK cwd: /workspaces/agent-feed/prod
  ├─ All file operations must be within workspace
  ├─ Enforced by SDK's file system access controls
  └─ Violations logged and rejected

Layer 2: Tool Restrictions
  ├─ allowedTools: explicit whitelist
  ├─ No access to system-level tools
  ├─ Bash commands restricted to workspace
  └─ Web fetch/search controlled

Layer 3: Permission Mode
  ├─ permissionMode: "bypassPermissions"
  ├─ Automation-friendly (no human prompts)
  ├─ But still workspace-constrained
  └─ Suitable for server-side execution

Layer 4: API-level Access Control
  ├─ API requires authentication (future)
  ├─ Rate limiting per session
  ├─ Request size limits
  └─ Timeout enforcement

Layer 5: Database-level Security
  ├─ Work queue isolation per user
  ├─ Ticket ownership validation
  ├─ Result sanitization
  └─ SQL injection prevention
```

### 6.2 Workspace Security

```typescript
/**
 * Workspace configuration and validation
 */
class WorkspaceSecurity {
  private allowedWorkspace = '/workspaces/agent-feed/prod/agent_workspace';

  /**
   * Validate that a path is within allowed workspace
   */
  validatePath(requestedPath: string): boolean {
    const resolved = path.resolve(requestedPath);
    const workspace = path.resolve(this.allowedWorkspace);

    if (!resolved.startsWith(workspace)) {
      logger.error('Workspace violation detected', {
        requested: requestedPath,
        resolved: resolved,
        workspace: workspace
      });

      return false;
    }

    return true;
  }

  /**
   * Sanitize file paths
   */
  sanitizePath(userPath: string): string {
    // Remove ../ attempts
    const cleaned = userPath.replace(/\.\.\//g, '');

    // Ensure relative to workspace
    const fullPath = path.join(this.allowedWorkspace, cleaned);

    // Validate
    if (!this.validatePath(fullPath)) {
      throw new Error('Path outside allowed workspace');
    }

    return fullPath;
  }
}
```

### 6.3 Security Monitoring

```typescript
/**
 * Security event logging
 */
interface SecurityEvent {
  type: 'workspace_violation' | 'tool_abuse' | 'rate_limit' | 'suspicious_pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  ticketId: string;
  userId: string;
  workerId: string;
  details: Record<string, any>;
  timestamp: Date;
}

/**
 * Alert on security violations
 */
private alertSecurityViolation(
  ticket: WorkTicket,
  error: Error
): void {
  const event: SecurityEvent = {
    type: 'workspace_violation',
    severity: 'high',
    ticketId: ticket.id,
    userId: ticket.userId,
    workerId: 'unknown',
    details: {
      error: error.message,
      content: ticket.payload.content
    },
    timestamp: new Date()
  };

  // Log to security audit log
  logger.error('SECURITY VIOLATION', event);

  // TODO: Send to monitoring system (Sentry, CloudWatch, etc.)
  // TODO: Alert security team if critical
}
```

---

## 7. Performance Considerations

### 7.1 Performance Metrics

| Metric | Target | Current (UnifiedAgentWorker) | Expected (ClaudeCodeWorker) |
|--------|--------|------------------------------|----------------------------|
| Average response time | < 3s | 1.5s | 2.5-3.5s |
| P95 response time | < 5s | 3s | 5-7s |
| P99 response time | < 10s | 5s | 10-12s |
| Timeout threshold | 120s | 60s | 120s |
| Token usage (avg) | < 2000 | 500 | 1500-2500 |
| Concurrent workers | 10 | 10 | 10 |
| Throughput (req/min) | > 100 | 150 | 80-100 |

### 7.2 Performance Optimization Strategies

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Optimization Strategies                          │
└─────────────────────────────────────────────────────────────────────┘

1. Prompt Optimization
   ├─ Keep prompts concise
   ├─ Minimize context size
   ├─ Use structured templates
   └─ Avoid redundant instructions

2. Caching Strategy
   ├─ Cache SDK session configurations
   ├─ Reuse HTTP connections (keep-alive)
   ├─ Cache frequently accessed files
   └─ Implement response caching for similar requests

3. Concurrent Execution
   ├─ Process multiple tickets in parallel
   ├─ Use worker pool pattern
   ├─ Non-blocking I/O for HTTP calls
   └─ Stream responses incrementally

4. Resource Management
   ├─ Limit max concurrent workers
   ├─ Timeout aggressive cleanup
   ├─ Memory-efficient response parsing
   └─ Connection pooling for API calls

5. Token Efficiency
   ├─ Compress prompts where possible
   ├─ Use tool-specific prompts
   ├─ Minimize response verbosity
   └─ Track and optimize token usage patterns
```

### 7.3 Monitoring and Alerting

```typescript
/**
 * Performance metrics tracking
 */
class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  recordLatency(operation: string, durationMs: number): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }

    this.metrics.get(operation)!.push(durationMs);

    // Alert if latency exceeds threshold
    if (durationMs > 10000) {
      logger.warn('High latency detected', {
        operation,
        durationMs
      });
    }
  }

  getP95Latency(operation: string): number {
    const samples = this.metrics.get(operation) || [];
    if (samples.length === 0) return 0;

    const sorted = samples.sort((a, b) => a - b);
    const index = Math.floor(sorted.length * 0.95);
    return sorted[index];
  }

  reportMetrics(): void {
    logger.info('Performance metrics', {
      operations: Array.from(this.metrics.keys()).map(op => ({
        operation: op,
        samples: this.metrics.get(op)!.length,
        avg: this.getAverageLatency(op),
        p95: this.getP95Latency(op)
      }))
    });
  }

  private getAverageLatency(operation: string): number {
    const samples = this.metrics.get(operation) || [];
    if (samples.length === 0) return 0;

    return samples.reduce((sum, val) => sum + val, 0) / samples.length;
  }
}
```

---

## 8. Integration Patterns

### 8.1 Drop-in Replacement Pattern

The ClaudeCodeWorker is designed as a drop-in replacement for UnifiedAgentWorker:

```typescript
// Before (UnifiedAgentWorker)
const worker = new UnifiedAgentWorker(db);
const result = await worker.executeTicket(ticket);

// After (ClaudeCodeWorker)
const worker = new ClaudeCodeWorker(db);
const result = await worker.executeTicket(ticket);

// WorkerResult interface remains the same
interface WorkerResult {
  success: boolean;
  output?: any;
  error?: Error;
  tokensUsed: number;
  duration: number;
}
```

### 8.2 WorkerSpawnerAdapter Integration

No changes required to WorkerSpawnerAdapter - just swap the worker class:

```typescript
// In worker-spawner.adapter.ts

// OLD:
import { UnifiedAgentWorker } from '../worker/unified-agent-worker';

private async executeWorker(ticket: PendingTicket, workerInfo: WorkerInfo): Promise<void> {
  const worker = new UnifiedAgentWorker(this.db);
  const result = await worker.executeTicket(workTicket);
  // ...
}

// NEW:
import { ClaudeCodeWorker } from '../worker/claude-code-worker';

private async executeWorker(ticket: PendingTicket, workerInfo: WorkerInfo): Promise<void> {
  const worker = new ClaudeCodeWorker(this.db);
  const result = await worker.executeTicket(workTicket);
  // ...
}
```

### 8.3 Feature Flag Pattern

For gradual rollout, implement a feature flag:

```typescript
/**
 * Worker factory with feature flag
 */
class WorkerFactory {
  private db: DatabaseManager;
  private useClaudeCode: boolean;

  constructor(db: DatabaseManager) {
    this.db = db;
    this.useClaudeCode = process.env.USE_CLAUDE_CODE_WORKER === 'true';
  }

  createWorker(): IWorker {
    if (this.useClaudeCode) {
      logger.info('Using ClaudeCodeWorker');
      return new ClaudeCodeWorker(this.db);
    } else {
      logger.info('Using UnifiedAgentWorker (legacy)');
      return new UnifiedAgentWorker(this.db);
    }
  }
}

// In WorkerSpawnerAdapter
private async executeWorker(ticket: PendingTicket, workerInfo: WorkerInfo): Promise<void> {
  const workerFactory = new WorkerFactory(this.db);
  const worker = workerFactory.createWorker();
  const result = await worker.executeTicket(workTicket);
  // ...
}
```

### 8.4 A/B Testing Pattern

For comparing performance between old and new workers:

```typescript
/**
 * A/B test configuration
 */
interface ABTestConfig {
  enabled: boolean;
  splitPercentage: number; // 0-100, % of traffic to ClaudeCodeWorker
  metrics: string[];
}

class ABTestingWorkerFactory {
  private config: ABTestConfig;

  constructor(db: DatabaseManager, config: ABTestConfig) {
    this.db = db;
    this.config = config;
  }

  createWorker(ticket: WorkTicket): IWorker {
    if (!this.config.enabled) {
      return new UnifiedAgentWorker(this.db);
    }

    // Deterministic split based on ticket ID
    const ticketNum = parseInt(ticket.id);
    const useNew = (ticketNum % 100) < this.config.splitPercentage;

    if (useNew) {
      logger.info('A/B test: Using ClaudeCodeWorker', { ticketId: ticket.id });
      return new ClaudeCodeWorker(this.db);
    } else {
      logger.info('A/B test: Using UnifiedAgentWorker', { ticketId: ticket.id });
      return new UnifiedAgentWorker(this.db);
    }
  }
}
```

---

## 9. Migration Strategy

### 9.1 Migration Phases

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Migration Timeline                          │
└─────────────────────────────────────────────────────────────────────┘

Phase 1: Development (Week 1-2)
  ├─ Implement ClaudeCodeWorker class
  ├─ Add comprehensive unit tests
  ├─ Integration tests with Claude Code SDK
  └─ Documentation

Phase 2: Staging Testing (Week 3)
  ├─ Deploy to staging environment
  ├─ Feature flag: USE_CLAUDE_CODE_WORKER=true
  ├─ Run parallel tests (old vs new worker)
  ├─ Performance benchmarking
  └─ Bug fixes

Phase 3: Canary Deployment (Week 4)
  ├─ Deploy to production with 5% traffic
  ├─ Monitor error rates
  ├─ Monitor performance metrics
  ├─ Rollback plan ready
  └─ Increase to 25% if stable

Phase 4: Gradual Rollout (Week 5-6)
  ├─ Increase to 50% traffic
  ├─ Continue monitoring
  ├─ Increase to 75% traffic
  └─ Increase to 100% traffic

Phase 5: Cleanup (Week 7)
  ├─ Remove feature flag
  ├─ Remove UnifiedAgentWorker (deprecated)
  ├─ Update documentation
  └─ Post-deployment review
```

### 9.2 Rollback Strategy

```typescript
/**
 * Circuit breaker pattern for automatic rollback
 */
class WorkerCircuitBreaker {
  private failureCount = 0;
  private successCount = 0;
  private failureThreshold = 10;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  async execute(fn: () => Promise<WorkerResult>): Promise<WorkerResult> {
    if (this.state === 'open') {
      logger.warn('Circuit breaker OPEN - using fallback worker');
      throw new Error('Circuit breaker open');
    }

    try {
      const result = await fn();

      if (result.success) {
        this.recordSuccess();
      } else {
        this.recordFailure();
      }

      return result;

    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordSuccess(): void {
    this.successCount++;
    this.failureCount = 0;

    if (this.state === 'half-open' && this.successCount >= 5) {
      this.state = 'closed';
      logger.info('Circuit breaker CLOSED - system recovered');
    }
  }

  private recordFailure(): void {
    this.failureCount++;

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';
      logger.error('Circuit breaker OPEN - too many failures');

      // Trigger automatic rollback
      this.triggerRollback();

      // Schedule half-open retry
      setTimeout(() => {
        this.state = 'half-open';
        logger.info('Circuit breaker HALF-OPEN - testing recovery');
      }, 60000); // 1 minute
    }
  }

  private triggerRollback(): void {
    logger.error('AUTOMATIC ROLLBACK TRIGGERED');
    // Set feature flag to false
    process.env.USE_CLAUDE_CODE_WORKER = 'false';
    // Alert ops team
    // TODO: Send alert to PagerDuty/Slack
  }
}
```

### 9.3 Data Migration

No data migration required - the new worker uses the same database schema and interfaces.

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Data Compatibility                             │
└─────────────────────────────────────────────────────────────────────┘

Work Queue Schema:
  ├─ work_queue table: NO CHANGES
  ├─ WorkTicket interface: NO CHANGES
  ├─ WorkerResult interface: NO CHANGES
  └─ Database queries: NO CHANGES

Token Analytics:
  ├─ token_analytics table: NO CHANGES
  ├─ TokenAnalyticsWriter: Compatible
  └─ Metrics collection: Enhanced

SSE Broadcasts:
  ├─ broadcastToolActivity(): Compatible
  ├─ Event format: NO CHANGES
  └─ SSE stream: Enhanced with more events
```

---

## 10. Appendix

### 10.1 File Structure

```
/workspaces/agent-feed/
├── src/
│   ├── worker/
│   │   ├── claude-code-worker.ts          [NEW]
│   │   ├── unified-agent-worker.ts        [DEPRECATED]
│   │   ├── agent-worker.ts                [KEPT - legacy RSS]
│   │   └── task-type-detector.ts          [KEPT - may be removed later]
│   │
│   ├── adapters/
│   │   └── worker-spawner.adapter.ts      [MODIFIED - swap worker class]
│   │
│   ├── services/
│   │   ├── ClaudeCodeSDKManager.js        [EXISTING]
│   │   └── TokenAnalyticsWriter.js        [EXISTING]
│   │
│   └── api/
│       └── routes/
│           └── claude-code-sdk.js         [EXISTING]
│
├── tests/
│   └── worker/
│       ├── claude-code-worker.test.ts     [NEW]
│       └── claude-code-worker.integration.test.ts [NEW]
│
└── docs/
    ├── ARCHITECTURE_CLAUDE_CODE_WORKER.md [THIS FILE]
    └── MIGRATION_GUIDE.md                 [NEW]
```

### 10.2 Key Interfaces Summary

```typescript
/**
 * Core interfaces for Claude Code Worker integration
 */

// Worker interface (unchanged)
interface IWorker {
  executeTicket(ticket: WorkTicket): Promise<WorkerResult>;
}

// Work ticket (unchanged)
interface WorkTicket {
  id: string;
  type: WorkTicketType;
  priority: number;
  agentName: string;
  userId: string;
  payload: any;
  createdAt: Date;
  status: WorkTicketStatus;
}

// Worker result (unchanged)
interface WorkerResult {
  success: boolean;
  output?: any;
  error?: Error;
  tokensUsed: number;
  duration: number;
}

// Claude Code Worker options (new)
interface ClaudeCodeWorkerOptions {
  apiBaseUrl?: string;
  timeout?: number;
  workspaceRoot?: string;
  streaming?: boolean;
}

// Claude Code API request (new)
interface ClaudeCodeRequest {
  message: string;
  options?: {
    sessionId?: string;
    cwd?: string;
    model?: string;
    allowedTools?: string[];
    maxTurns?: number;
  };
}

// Claude Code API response (new)
interface ClaudeCodeResponse {
  success: boolean;
  message?: string;
  responses?: Array<any>;
  timestamp?: string;
  claudeCode?: boolean;
  toolsEnabled?: boolean;
  error?: string;
  details?: string;
}
```

### 10.3 Configuration Reference

```typescript
/**
 * Environment variables for ClaudeCodeWorker
 */
const CONFIG = {
  // Feature flag
  USE_CLAUDE_CODE_WORKER: process.env.USE_CLAUDE_CODE_WORKER === 'true',

  // API configuration
  API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000',

  // Worker configuration
  WORKER_TIMEOUT: parseInt(process.env.WORKER_TIMEOUT || '120000'),
  MAX_CONCURRENT_WORKERS: parseInt(process.env.MAX_CONCURRENT_WORKERS || '10'),

  // Workspace configuration
  WORKSPACE_ROOT: process.env.WORKSPACE_ROOT || '/workspaces/agent-feed/prod/agent_workspace',

  // Claude Code SDK configuration
  CLAUDE_MODEL: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
  CLAUDE_MAX_TURNS: parseInt(process.env.CLAUDE_MAX_TURNS || '10'),

  // Performance tuning
  ENABLE_RESPONSE_STREAMING: process.env.ENABLE_RESPONSE_STREAMING !== 'false',
  ENABLE_TOKEN_ANALYTICS: process.env.ENABLE_TOKEN_ANALYTICS !== 'false',

  // Retry configuration
  MAX_RETRIES: parseInt(process.env.MAX_RETRIES || '3'),
  RETRY_DELAY_MS: parseInt(process.env.RETRY_DELAY_MS || '1000'),

  // Circuit breaker
  CIRCUIT_BREAKER_THRESHOLD: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || '10'),
  CIRCUIT_BREAKER_TIMEOUT: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || '60000'),
};
```

### 10.4 Testing Strategy

```typescript
/**
 * Test coverage requirements
 */

// Unit tests
describe('ClaudeCodeWorker', () => {
  it('should execute ticket and return success result');
  it('should handle timeout errors');
  it('should handle API errors');
  it('should extract tokens from response');
  it('should prepare correct prompt format');
  it('should enforce workspace boundaries');
  it('should handle malformed responses');
  it('should retry on retryable errors');
  it('should not retry on non-retryable errors');
});

// Integration tests
describe('ClaudeCodeWorker Integration', () => {
  it('should create file via Claude Code SDK');
  it('should read file via Claude Code SDK');
  it('should edit file via Claude Code SDK');
  it('should execute bash command via Claude Code SDK');
  it('should handle workspace violations');
  it('should track token usage correctly');
  it('should broadcast tool activity to SSE');
  it('should complete full ticket lifecycle');
});

// Performance tests
describe('ClaudeCodeWorker Performance', () => {
  it('should complete within timeout threshold');
  it('should handle 10 concurrent workers');
  it('should maintain low memory footprint');
  it('should optimize token usage');
});

// Security tests
describe('ClaudeCodeWorker Security', () => {
  it('should reject paths outside workspace');
  it('should sanitize user input');
  it('should enforce tool restrictions');
  it('should log security violations');
});
```

### 10.5 Monitoring Dashboard

```typescript
/**
 * Key metrics to monitor in production
 */
const DASHBOARD_METRICS = {
  // Performance metrics
  'worker.latency.avg': 'Average worker execution time',
  'worker.latency.p95': '95th percentile latency',
  'worker.latency.p99': '99th percentile latency',

  // Success metrics
  'worker.success_rate': 'Percentage of successful executions',
  'worker.failure_rate': 'Percentage of failed executions',
  'worker.timeout_rate': 'Percentage of timeout failures',

  // Token metrics
  'worker.tokens.avg': 'Average tokens per execution',
  'worker.tokens.total': 'Total tokens consumed',
  'worker.cost.total': 'Total cost ($)',

  // Concurrency metrics
  'worker.active': 'Currently active workers',
  'worker.queue_depth': 'Pending tickets in queue',

  // Error metrics
  'worker.errors.api': 'API-related errors',
  'worker.errors.sdk': 'SDK-related errors',
  'worker.errors.workspace': 'Workspace violations',

  // Security metrics
  'worker.security.violations': 'Security violations detected',
  'worker.security.alerts': 'Security alerts triggered',
};
```

### 10.6 References

1. **Claude Code SDK Documentation**: `@anthropic-ai/claude-code` package
2. **Existing API Route**: `/workspaces/agent-feed/src/api/routes/claude-code-sdk.js`
3. **SDK Manager**: `/workspaces/agent-feed/src/services/ClaudeCodeSDKManager.js`
4. **Current Worker**: `/workspaces/agent-feed/src/worker/unified-agent-worker.ts`
5. **Worker Spawner**: `/workspaces/agent-feed/src/adapters/worker-spawner.adapter.ts`
6. **Work Queue Repository**: `../../api-server/repositories/postgres/work-queue.repository.js`
7. **Token Analytics**: `/workspaces/agent-feed/src/services/TokenAnalyticsWriter.js`

---

## Document Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-14 | Architecture Team | Initial architecture design |

---

## Architecture Decision Records (ADRs)

### ADR-001: Use Claude Code SDK Instead of Manual Tool Routing

**Status**: Accepted
**Date**: 2025-10-14

**Context**: The current UnifiedAgentWorker uses regex-based pattern matching to detect file operations, which is fragile and limited.

**Decision**: Integrate the official `@anthropic-ai/claude-code` SDK to delegate all natural language interpretation and tool usage to Claude.

**Consequences**:
- Pros: More intelligent task interpretation, native tool access, no regex maintenance
- Cons: Increased latency (~1-2s), higher token usage, external API dependency

### ADR-002: Use HTTP API Instead of Direct SDK Integration

**Status**: Accepted
**Date**: 2025-10-14

**Context**: We could integrate the SDK directly in the worker or use the existing HTTP API endpoint.

**Decision**: Use the existing `/api/claude-code/streaming-chat` HTTP endpoint for consistency and separation of concerns.

**Consequences**:
- Pros: Consistent with existing architecture, easier testing, better separation
- Cons: Slight overhead from HTTP serialization

### ADR-003: Maintain Drop-in Compatibility with UnifiedAgentWorker

**Status**: Accepted
**Date**: 2025-10-14

**Context**: We need to minimize changes to the orchestrator and spawner.

**Decision**: ClaudeCodeWorker implements the same IWorker interface as UnifiedAgentWorker.

**Consequences**:
- Pros: Minimal changes to existing code, easy rollback, gradual migration
- Cons: Must maintain interface compatibility

---

**End of Architecture Document**
