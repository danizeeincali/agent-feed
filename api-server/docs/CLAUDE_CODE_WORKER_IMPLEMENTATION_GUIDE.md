# Claude Code Worker - Implementation Guide

**Purpose**: Step-by-step implementation guide with code examples

---

## Implementation Overview

This guide provides the exact code needed to implement the `ClaudeCodeWorker` class that integrates with the Claude Code SDK.

---

## Step 1: Create ClaudeCodeWorker Class

**File**: `/workspaces/agent-feed/src/worker/claude-code-worker.ts`

```typescript
/**
 * ClaudeCodeWorker - Claude Code SDK-powered worker
 *
 * Replaces UnifiedAgentWorker with full Claude Code integration.
 * Delegates all natural language interpretation and tool usage to Claude.
 */

import type { DatabaseManager } from '../types/database-manager';
import type { WorkTicket } from '../types/work-ticket';
import type { WorkerResult } from '../types/worker';
import logger from '../utils/logger';
import crypto from 'crypto';

/**
 * Worker configuration options
 */
export interface ClaudeCodeWorkerOptions {
  /** API base URL (default: http://localhost:3000) */
  apiBaseUrl?: string;

  /** Execution timeout in milliseconds (default: 120000) */
  timeout?: number;

  /** Workspace root path */
  workspaceRoot?: string;

  /** Whether to enable streaming mode (default: true) */
  streaming?: boolean;
}

/**
 * Claude Code API request format
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
 * Claude Code API response format
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

/**
 * ClaudeCodeWorker implementation
 */
export class ClaudeCodeWorker {
  private db: DatabaseManager;
  private apiBaseUrl: string;
  private timeout: number;
  private workspaceRoot: string;
  private streaming: boolean;

  constructor(db: DatabaseManager, options: ClaudeCodeWorkerOptions = {}) {
    this.db = db;
    this.apiBaseUrl = options.apiBaseUrl || 'http://localhost:3000';
    this.timeout = options.timeout || 120000; // 2 minutes default
    this.workspaceRoot = options.workspaceRoot || '/workspaces/agent-feed/prod/agent_workspace';
    this.streaming = options.streaming !== false;

    logger.info('ClaudeCodeWorker initialized', {
      apiBaseUrl: this.apiBaseUrl,
      timeout: this.timeout,
      workspaceRoot: this.workspaceRoot,
    });
  }

  /**
   * Execute work ticket - main entry point
   * @implements IWorker.executeTicket
   */
  async executeTicket(ticket: WorkTicket): Promise<WorkerResult> {
    const startTime = Date.now();

    try {
      logger.info('ClaudeCodeWorker executing ticket', {
        ticketId: ticket.id,
        userId: ticket.userId,
        timeout: this.timeout,
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
        sessionId: `ticket_${ticket.id}_${Date.now()}`,
      });

      // Race between execution and timeout
      const response = (await Promise.race([
        executionPromise,
        timeoutPromise,
      ])) as ClaudeCodeResponse;

      // Extract result from response
      return this.extractResult(response, startTime);
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('Ticket execution failed', {
        ticketId: ticket.id,
        error: error instanceof Error ? error.message : String(error),
        duration,
      });

      return this.handleError(error, ticket, duration);
    }
  }

  /**
   * Prepare Claude-friendly prompt from ticket
   */
  private prepareClaudePrompt(ticket: WorkTicket): string {
    const content = ticket.payload.content || '';
    const metadata = ticket.payload.metadata || {};

    // Build structured prompt for Claude
    const prompt = `
You are an AI agent worker processing a user request.

USER REQUEST:
${content}

${Object.keys(metadata).length > 0 ? `METADATA:\n${JSON.stringify(metadata, null, 2)}\n` : ''}

WORKSPACE:
You are working in: ${this.workspaceRoot}
All file operations MUST be within this workspace.

YOUR TASK:
1. Interpret the user's request carefully
2. Execute the necessary operations using available tools:
   - Use Read tool to read files
   - Use Write tool to create new files
   - Use Edit tool to modify existing files
   - Use Bash tool to execute shell commands (within workspace)
   - Use Grep/Glob tools to search for files/content
3. Return a clear, concise summary of what you accomplished

CONSTRAINTS:
- Stay within workspace boundaries at all times
- Don't execute destructive operations without clear intent
- Return a concise summary of the result (not verbose)
- If the request is unclear, ask for clarification

Please proceed with the request.
`.trim();

    logger.debug('Prepared Claude prompt', {
      ticketId: ticket.id,
      promptLength: prompt.length,
      contentPreview: content.substring(0, 100),
    });

    return prompt;
  }

  /**
   * Execute Claude Code via streaming-chat API
   */
  private async executeClaudeCode(
    prompt: string,
    options: { sessionId: string }
  ): Promise<ClaudeCodeResponse> {
    const requestBody: ClaudeCodeRequest = {
      message: prompt,
      options: {
        sessionId: options.sessionId,
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
          'WebSearch',
        ],
        maxTurns: 10,
      },
    };

    logger.debug('Calling Claude Code API', {
      sessionId: options.sessionId,
      url: `${this.apiBaseUrl}/api/claude-code/streaming-chat`,
      promptLength: prompt.length,
    });

    try {
      const response = await fetch(
        `${this.apiBaseUrl}/api/claude-code/streaming-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(
          `HTTP ${response.status}: ${response.statusText} - ${errorText}`
        );
      }

      const data: ClaudeCodeResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || data.details || 'Unknown error');
      }

      logger.info('Claude Code API call successful', {
        sessionId: options.sessionId,
        hasResponses: !!data.responses,
        responsesCount: data.responses?.length || 0,
      });

      return data;
    } catch (error) {
      logger.error('Claude Code API call failed', {
        error: error instanceof Error ? error.message : String(error),
        sessionId: options.sessionId,
        url: `${this.apiBaseUrl}/api/claude-code/streaming-chat`,
      });

      throw error;
    }
  }

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
      outputLength: outputMessage.length,
    });

    return {
      success: response.success,
      output: outputMessage,
      tokensUsed: tokensUsed,
      duration: duration,
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

    logger.debug('Extracted token usage', {
      totalTokens,
      responsesChecked: response.responses.length,
    });

    return totalTokens;
  }

  /**
   * Handle errors and categorize them
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
        timeout: this.timeout,
      });

      return {
        success: false,
        error: new Error(`Worker execution timeout after ${this.timeout}ms`),
        tokensUsed: 0,
        duration,
      };
    }

    // API errors (HTTP errors)
    if (error instanceof Error && error.message.match(/HTTP \d+/)) {
      const statusMatch = error.message.match(/HTTP (\d+)/);
      const status = statusMatch ? parseInt(statusMatch[1]) : 0;

      logger.error('API error', {
        ticketId: ticket.id,
        status,
        error: error.message,
      });

      return {
        success: false,
        error: error,
        tokensUsed: 0,
        duration,
      };
    }

    // Workspace violations
    if (error instanceof Error && error.message.includes('workspace')) {
      logger.error('Workspace violation', {
        ticketId: ticket.id,
        error: error.message,
      });

      return {
        success: false,
        error: new Error('Workspace access violation'),
        tokensUsed: 0,
        duration,
      };
    }

    // Unknown errors
    logger.error('Unknown worker error', {
      ticketId: ticket.id,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
      tokensUsed: 0,
      duration,
    };
  }
}
```

---

## Step 2: Update WorkerSpawnerAdapter

**File**: `/workspaces/agent-feed/src/adapters/worker-spawner.adapter.ts`

**Change Line 12**: Replace import statement

```typescript
// OLD:
import { UnifiedAgentWorker } from '../worker/unified-agent-worker';

// NEW:
import { ClaudeCodeWorker } from '../worker/claude-code-worker';
```

**Change Line 157**: Replace worker instantiation

```typescript
// OLD:
const worker = new UnifiedAgentWorker(this.db);

// NEW:
const worker = new ClaudeCodeWorker(this.db);
```

**Complete section** (lines 143-158):

```typescript
/**
 * Execute worker for ticket
 * @param ticket - Pending ticket
 * @param workerInfo - Worker information object
 */
private async executeWorker(ticket: PendingTicket, workerInfo: WorkerInfo): Promise<void> {
  try {
    await this.initRepository();

    // Validate and parse ticket ID
    const ticketIdNum = validateTicketId(ticket.id);

    // Mark ticket as processing
    await this.workQueueRepository.startProcessing(ticketIdNum);

    // Create work ticket object for ClaudeCodeWorker
    const workTicket = await this.loadWorkTicket(ticket.id);

    // Execute worker with ClaudeCodeWorker (Claude Code SDK integration)
    const worker = new ClaudeCodeWorker(this.db);
    const result = await worker.executeTicket(workTicket);

    // ... rest of the method stays the same
  }
}
```

---

## Step 3: Add Feature Flag Support (Optional)

**File**: `/workspaces/agent-feed/src/adapters/worker-spawner.adapter.ts`

Add a factory method for gradual rollout:

```typescript
/**
 * Create worker based on feature flag
 */
private createWorker(): IWorker {
  const useClaudeCode = process.env.USE_CLAUDE_CODE_WORKER === 'true';

  if (useClaudeCode) {
    logger.info('Using ClaudeCodeWorker (Claude Code SDK)');
    return new ClaudeCodeWorker(this.db);
  } else {
    logger.info('Using UnifiedAgentWorker (legacy)');
    return new UnifiedAgentWorker(this.db);
  }
}
```

Then update `executeWorker`:

```typescript
private async executeWorker(ticket: PendingTicket, workerInfo: WorkerInfo): Promise<void> {
  try {
    // ... setup code ...

    // Create worker based on feature flag
    const worker = this.createWorker();
    const result = await worker.executeTicket(workTicket);

    // ... rest of the method ...
  }
}
```

---

## Step 4: Add Environment Variables

**File**: `.env` or environment configuration

```bash
# Feature flag (optional - for gradual rollout)
USE_CLAUDE_CODE_WORKER=true

# API configuration (required)
API_BASE_URL=http://localhost:3000

# Worker configuration (optional - has defaults)
WORKER_TIMEOUT=120000
MAX_CONCURRENT_WORKERS=10

# Workspace configuration (optional - has default)
WORKSPACE_ROOT=/workspaces/agent-feed/prod/agent_workspace

# Claude Code SDK configuration (optional - has defaults)
CLAUDE_MODEL=claude-sonnet-4-20250514
CLAUDE_MAX_TURNS=10

# Performance tuning (optional - defaults to true)
ENABLE_RESPONSE_STREAMING=true
ENABLE_TOKEN_ANALYTICS=true
```

---

## Step 5: Create Unit Tests

**File**: `/workspaces/agent-feed/tests/worker/claude-code-worker.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClaudeCodeWorker } from '../../src/worker/claude-code-worker';
import type { DatabaseManager } from '../../src/types/database-manager';
import type { WorkTicket } from '../../src/types/work-ticket';

describe('ClaudeCodeWorker', () => {
  let worker: ClaudeCodeWorker;
  let mockDb: DatabaseManager;

  beforeEach(() => {
    mockDb = {} as DatabaseManager;
    worker = new ClaudeCodeWorker(mockDb, {
      apiBaseUrl: 'http://localhost:3000',
      timeout: 5000,
      workspaceRoot: '/test/workspace',
    });
  });

  it('should create worker instance', () => {
    expect(worker).toBeDefined();
  });

  it('should prepare correct prompt format', () => {
    const ticket: WorkTicket = {
      id: '1',
      type: 'post_response',
      priority: 5,
      agentName: 'test-agent',
      userId: 'user-1',
      payload: {
        content: 'create file test.txt',
        metadata: { source: 'test' },
      },
      createdAt: new Date(),
      status: 'pending',
    };

    // Access private method via type assertion for testing
    const prompt = (worker as any).prepareClaudePrompt(ticket);

    expect(prompt).toContain('create file test.txt');
    expect(prompt).toContain('/test/workspace');
    expect(prompt).toContain('METADATA');
  });

  it('should handle timeout errors', async () => {
    const ticket: WorkTicket = {
      id: '1',
      type: 'post_response',
      priority: 5,
      agentName: 'test-agent',
      userId: 'user-1',
      payload: { content: 'test' },
      createdAt: new Date(),
      status: 'pending',
    };

    // Mock fetch to delay longer than timeout
    global.fetch = vi.fn(() =>
      new Promise((resolve) => setTimeout(resolve, 10000))
    ) as any;

    const result = await worker.executeTicket(ticket);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('timeout');
  });

  it('should extract token usage from response', () => {
    const response = {
      success: true,
      message: 'Test',
      responses: [
        {
          type: 'assistant',
          messages: [
            {
              type: 'result',
              usage: {
                input_tokens: 100,
                output_tokens: 50,
              },
            },
          ],
        },
      ],
    };

    const tokens = (worker as any).extractTokenUsage(response);
    expect(tokens).toBe(150);
  });

  it('should handle API errors', async () => {
    const ticket: WorkTicket = {
      id: '1',
      type: 'post_response',
      priority: 5,
      agentName: 'test-agent',
      userId: 'user-1',
      payload: { content: 'test' },
      createdAt: new Date(),
      status: 'pending',
    };

    // Mock fetch to return 500 error
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Server error'),
      })
    ) as any;

    const result = await worker.executeTicket(ticket);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('HTTP 500');
  });
});
```

---

## Step 6: Create Integration Tests

**File**: `/workspaces/agent-feed/tests/worker/claude-code-worker.integration.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { ClaudeCodeWorker } from '../../src/worker/claude-code-worker';
import type { DatabaseManager } from '../../src/types/database-manager';
import type { WorkTicket } from '../../src/types/work-ticket';

describe('ClaudeCodeWorker Integration Tests', () => {
  let worker: ClaudeCodeWorker;
  let mockDb: DatabaseManager;

  beforeAll(() => {
    mockDb = {} as DatabaseManager;
    worker = new ClaudeCodeWorker(mockDb, {
      apiBaseUrl: 'http://localhost:3000',
      timeout: 30000,
    });
  });

  it('should execute file creation task', async () => {
    const ticket: WorkTicket = {
      id: '1',
      type: 'post_response',
      priority: 5,
      agentName: 'test-agent',
      userId: 'user-1',
      payload: {
        content: 'create file test-integration.txt with content "Hello from integration test"',
      },
      createdAt: new Date(),
      status: 'pending',
    };

    const result = await worker.executeTicket(ticket);

    expect(result.success).toBe(true);
    expect(result.output).toBeDefined();
    expect(result.tokensUsed).toBeGreaterThan(0);
    expect(result.duration).toBeGreaterThan(0);
  }, 30000);

  it('should handle invalid requests gracefully', async () => {
    const ticket: WorkTicket = {
      id: '2',
      type: 'post_response',
      priority: 5,
      agentName: 'test-agent',
      userId: 'user-1',
      payload: {
        content: '', // Empty content
      },
      createdAt: new Date(),
      status: 'pending',
    };

    const result = await worker.executeTicket(ticket);

    expect(result).toBeDefined();
    expect(result.duration).toBeGreaterThan(0);
  }, 30000);
});
```

---

## Step 7: Run Tests

```bash
# Run unit tests
npm test -- claude-code-worker.test.ts

# Run integration tests (requires API server running)
npm test -- claude-code-worker.integration.test.ts

# Run all worker tests
npm test -- src/worker/
```

---

## Step 8: Deploy to Staging

```bash
# 1. Set environment variables
export USE_CLAUDE_CODE_WORKER=false  # Start with feature flag OFF
export API_BASE_URL=http://localhost:3000
export WORKER_TIMEOUT=120000

# 2. Build the project
npm run build

# 3. Start the server
npm start

# 4. Enable feature flag gradually
export USE_CLAUDE_CODE_WORKER=true

# 5. Restart server
npm restart
```

---

## Step 9: Monitor Metrics

Create a monitoring dashboard to track:

```typescript
// Example metrics collection
interface WorkerMetrics {
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  timeoutCount: number;
  avgDuration: number;
  avgTokens: number;
  p95Duration: number;
}

class MetricsCollector {
  private metrics: WorkerMetrics = {
    totalExecutions: 0,
    successCount: 0,
    failureCount: 0,
    timeoutCount: 0,
    avgDuration: 0,
    avgTokens: 0,
    p95Duration: 0,
  };

  recordExecution(result: WorkerResult): void {
    this.metrics.totalExecutions++;

    if (result.success) {
      this.metrics.successCount++;
    } else {
      this.metrics.failureCount++;
      if (result.error?.message.includes('timeout')) {
        this.metrics.timeoutCount++;
      }
    }

    // Update averages
    this.metrics.avgDuration =
      (this.metrics.avgDuration * (this.metrics.totalExecutions - 1) +
        result.duration) /
      this.metrics.totalExecutions;

    this.metrics.avgTokens =
      (this.metrics.avgTokens * (this.metrics.totalExecutions - 1) +
        result.tokensUsed) /
      this.metrics.totalExecutions;
  }

  getMetrics(): WorkerMetrics {
    return { ...this.metrics };
  }
}
```

---

## Step 10: Gradual Rollout

```typescript
/**
 * A/B testing with gradual percentage rollout
 */
class GradualRollout {
  private percentage: number;

  constructor(percentage: number) {
    this.percentage = Math.min(100, Math.max(0, percentage));
  }

  shouldUseNewWorker(ticketId: string): boolean {
    const ticketNum = parseInt(ticketId);
    return (ticketNum % 100) < this.percentage;
  }

  createWorker(db: DatabaseManager, ticketId: string): IWorker {
    if (this.shouldUseNewWorker(ticketId)) {
      logger.info('Using ClaudeCodeWorker', { ticketId, percentage: this.percentage });
      return new ClaudeCodeWorker(db);
    } else {
      logger.info('Using UnifiedAgentWorker', { ticketId, percentage: this.percentage });
      return new UnifiedAgentWorker(db);
    }
  }
}

// Usage in WorkerSpawnerAdapter
const rollout = new GradualRollout(parseInt(process.env.ROLLOUT_PERCENTAGE || '0'));
const worker = rollout.createWorker(this.db, ticket.id);
```

**Rollout schedule**:
- Week 1: `ROLLOUT_PERCENTAGE=5` (5% of traffic)
- Week 2: `ROLLOUT_PERCENTAGE=25` (25% of traffic)
- Week 3: `ROLLOUT_PERCENTAGE=50` (50% of traffic)
- Week 4: `ROLLOUT_PERCENTAGE=100` (100% of traffic)

---

## Troubleshooting

### Issue: TypeScript compilation errors

```bash
# Check for missing type definitions
npm install --save-dev @types/node

# Rebuild
npm run build
```

### Issue: Tests failing

```bash
# Make sure API server is running for integration tests
npm run dev

# Run tests in watch mode
npm test -- --watch
```

### Issue: Worker timeouts in production

```bash
# Increase timeout
export WORKER_TIMEOUT=180000  # 3 minutes

# Check API server health
curl http://localhost:3000/api/claude-code/health

# Check logs
tail -f logs/worker.log
```

---

## Verification Checklist

- [ ] ClaudeCodeWorker class compiles without errors
- [ ] Unit tests pass (100% coverage of core methods)
- [ ] Integration tests pass with real API
- [ ] Feature flag toggles between old/new worker
- [ ] Timeout handling works correctly
- [ ] Error categorization works correctly
- [ ] Token extraction works correctly
- [ ] Workspace boundaries are enforced
- [ ] Metrics are being collected
- [ ] SSE broadcasts are working
- [ ] Database updates are correct
- [ ] No regression in existing functionality

---

## Next Steps After Implementation

1. **Code Review**: Get architecture and code review approval
2. **Staging Tests**: Deploy to staging, run full test suite
3. **Performance Baseline**: Establish baseline metrics
4. **Canary Deployment**: Deploy to 5% of production traffic
5. **Monitor**: Watch metrics for 48 hours
6. **Gradual Rollout**: Increase to 25%, 50%, 100% over 2 weeks
7. **Documentation**: Update API docs and runbooks
8. **Cleanup**: Remove deprecated UnifiedAgentWorker code
9. **Post-mortem**: Document lessons learned

---

**Implementation Status**: Ready for Development
**Estimated Time**: 3-5 days for implementation + testing
**Risk Level**: Medium (new integration, but with feature flag safety)
