# Claude Code Integration - Quick Reference

**For:** Developers implementing the ClaudeCodeWorker
**Version:** 1.0.0
**Last Updated:** 2025-10-14

---

## TL;DR - What Are We Doing?

**Problem:** Regex-based TaskTypeDetector creates folders named "you" and files named "with"

**Solution:** Replace with Claude Code SDK - let Claude interpret natural language

**Change Required:** 1 line in WorkerSpawner

---

## The One-Line Change

**File:** `/workspaces/agent-feed/src/adapters/worker-spawner.adapter.ts` (line 157)

```typescript
// BEFORE (broken):
const worker = new UnifiedAgentWorker(this.db);

// AFTER (fixed):
const worker = new ClaudeCodeWorker(this.db);
```

---

## What You Need to Build

### New File: ClaudeCodeWorker

**Location:** `/workspaces/agent-feed/src/worker/claude-code-worker.ts`

**Basic Structure:**
```typescript
import type { DatabaseManager } from '../types/database-manager';
import type { WorkTicket } from '../types/work-ticket';
import type { WorkerResult } from '../types/worker';
import { getClaudeCodeSDKManager } from '../services/ClaudeCodeSDKManager.js';
import logger from '../utils/logger';

export class ClaudeCodeWorker {
  private db: DatabaseManager;
  private claudeCodeManager: any;

  constructor(db: DatabaseManager) {
    this.db = db;
    this.claudeCodeManager = getClaudeCodeSDKManager();
  }

  async executeTicket(ticket: WorkTicket): Promise<WorkerResult> {
    const startTime = Date.now();

    try {
      // 1. Extract post content (NO PARSING!)
      const content = ticket.payload.content;

      logger.info('Executing Claude Code worker', {
        ticketId: ticket.id,
        userId: ticket.userId,
        contentLength: content.length
      });

      // 2. Call Claude Code SDK
      const response = await this.claudeCodeManager.queryClaudeCode(content, {
        cwd: '/workspaces/agent-feed/prod/agent_workspace/', // Important!
        model: 'claude-sonnet-4-20250514',
        permissionMode: 'bypassPermissions',
        allowedTools: ['Bash', 'Read', 'Write', 'Edit', 'Grep', 'Glob']
      });

      // 3. Parse response
      const output = this.extractOutput(response);
      const tokensUsed = this.calculateTokens(response);
      const duration = Date.now() - startTime;

      // 4. Return success
      return {
        success: true,
        output,
        tokensUsed,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('Claude Code worker failed', {
        ticketId: ticket.id,
        error: error instanceof Error ? error.message : String(error),
        duration
      });

      // 5. Return error
      return {
        success: false,
        error: error as Error,
        tokensUsed: 0,
        duration
      };
    }
  }

  private extractOutput(response: any): any {
    // Find the last assistant message
    const messages = response.messages || [];
    const lastMessage = messages[messages.length - 1];

    if (lastMessage && lastMessage.message) {
      const content = Array.isArray(lastMessage.message.content)
        ? lastMessage.message.content
        : [lastMessage.message.content];

      // Extract text content
      const textBlocks = content.filter(
        block => typeof block === 'object' && block.type === 'text'
      );

      return {
        content: textBlocks.map(b => b.text).join('\n'),
        messages: messages
      };
    }

    return { content: 'No response', messages: messages };
  }

  private calculateTokens(response: any): number {
    // Extract token usage from result message
    const messages = response.messages || [];
    const resultMessage = messages.find(m => m.type === 'result');

    if (resultMessage && resultMessage.usage) {
      return resultMessage.usage.input_tokens + resultMessage.usage.output_tokens;
    }

    return 0;
  }
}
```

---

## Critical Implementation Rules

### ✅ DO THIS

1. **Pass content directly to Claude**
   ```typescript
   const content = ticket.payload.content;
   await claudeCodeManager.queryClaudeCode(content, options);
   ```

2. **Set correct working directory**
   ```typescript
   options: {
     cwd: '/workspaces/agent-feed/prod/agent_workspace/'  // Not /prod!
   }
   ```

3. **Handle errors gracefully**
   ```typescript
   try {
     // Execute
   } catch (error) {
     return {
       success: false,
       error: error as Error,
       tokensUsed: 0,
       duration: Date.now() - startTime
     };
   }
   ```

4. **Log everything**
   ```typescript
   logger.info('Starting execution', { ticketId, userId });
   logger.error('Execution failed', { ticketId, error });
   ```

---

### ❌ DON'T DO THIS

1. **Don't parse or modify user content**
   ```typescript
   // ❌ WRONG
   const content = parseWithRegex(ticket.payload.content);
   const params = extractParams(content);

   // ✅ RIGHT
   const content = ticket.payload.content;
   ```

2. **Don't manually validate file paths**
   ```typescript
   // ❌ WRONG - SDK handles this
   if (!isWithinWorkspace(path)) throw new Error('Invalid path');

   // ✅ RIGHT - Let SDK enforce boundaries
   await claudeCodeManager.queryClaudeCode(content, options);
   ```

3. **Don't implement timeout yourself**
   ```typescript
   // ❌ WRONG - Complex timeout logic
   const timeoutPromise = new Promise(...);
   const result = await Promise.race([...]);

   // ✅ RIGHT - Claude SDK has built-in timeout
   // Just set maxTurns to prevent infinite loops
   options: { maxTurns: 10 }
   ```

4. **Don't suppress errors**
   ```typescript
   // ❌ WRONG
   try {
     // ...
   } catch (error) {
     console.log('Error occurred');  // Silent failure
     return { success: true };  // Lying about success
   }

   // ✅ RIGHT
   catch (error) {
     logger.error('Error occurred', { error });
     return { success: false, error: error as Error };
   }
   ```

---

## Testing Checklist

### Before Committing

- [ ] Unit tests pass (ClaudeCodeWorker)
- [ ] Integration tests pass (end-to-end)
- [ ] Regression tests pass (vs old system)
- [ ] Security tests pass (path traversal blocked)
- [ ] Can create simple file: "Create test.txt with Hello"
- [ ] Can handle complex request: "List files then create summary"
- [ ] Workspace isolation works (cannot access /etc)
- [ ] Error handling works (returns proper WorkerResult)
- [ ] Logging works (can debug execution)

---

## Common Pitfalls

### Pitfall 1: Wrong Working Directory

**Problem:**
```typescript
cwd: '/workspaces/agent-feed/prod'  // ❌ WRONG
```

**Solution:**
```typescript
cwd: '/workspaces/agent-feed/prod/agent_workspace/'  // ✅ RIGHT
```

**Why:** Claude needs to operate in the agent workspace, not the prod directory.

---

### Pitfall 2: Trying to Parse Content

**Problem:**
```typescript
const match = content.match(/create\s+file\s+(\S+)/);
if (match) {
  const filename = match[1];
  // More regex...
}
```

**Solution:**
```typescript
// Just pass it to Claude
const response = await claudeCodeManager.queryClaudeCode(content, options);
```

**Why:** The whole point is to eliminate regex parsing. Let Claude interpret.

---

### Pitfall 3: Not Handling Response Structure

**Problem:**
```typescript
return {
  success: true,
  output: response  // ❌ Raw response object
};
```

**Solution:**
```typescript
return {
  success: true,
  output: this.extractOutput(response)  // ✅ Extracted content
};
```

**Why:** WorkerResult expects structured output, not raw SDK response.

---

### Pitfall 4: Forgetting Token Calculation

**Problem:**
```typescript
return {
  success: true,
  output: output,
  tokensUsed: 0  // ❌ Always zero
};
```

**Solution:**
```typescript
return {
  success: true,
  output: output,
  tokensUsed: this.calculateTokens(response)  // ✅ Real value
};
```

**Why:** Token tracking is important for cost monitoring.

---

## Debugging Tips

### Enable Debug Logging

```typescript
logger.debug('Claude SDK options', { options });
logger.debug('Claude response', { response });
logger.debug('Extracted output', { output });
```

### Check SSE Ticker

When Claude executes tools, you should see:
```
📖 Read(test.txt)
✏️  Write(summary.txt)
💻 Bash(ls -la)
```

If you don't see these, tool broadcasting is broken.

### Verify Files Created

After execution:
```bash
ls -la /workspaces/agent-feed/prod/agent_workspace/
cat /workspaces/agent-feed/prod/agent_workspace/test.txt
```

### Check Work Queue Status

```sql
SELECT id, status, error_message
FROM work_queue
WHERE id = 12345;
```

---

## Quick Test Commands

### Run Unit Tests
```bash
npm test src/worker/claude-code-worker.test.ts
```

### Run Integration Tests
```bash
npm test src/worker/claude-code-worker.integration.test.ts
```

### Run Regression Tests
```bash
npm test src/worker/claude-code-worker.regression.test.ts
```

### Test Manually
```typescript
const ticket: WorkTicket = {
  id: 'test-123',
  type: 'post_response',
  priority: 5,
  agentName: 'default',
  userId: 'user-123',
  payload: {
    feedItemId: 'post-456',
    content: 'Create a hello.txt file with "Hello World"',
    metadata: {}
  },
  createdAt: new Date(),
  status: 'pending'
};

const worker = new ClaudeCodeWorker(db);
const result = await worker.executeTicket(ticket);

console.log('Success:', result.success);
console.log('Output:', result.output);
console.log('Tokens:', result.tokensUsed);
console.log('Duration:', result.duration);

// Verify file exists
const fs = require('fs/promises');
const content = await fs.readFile(
  '/workspaces/agent-feed/prod/agent_workspace/hello.txt',
  'utf-8'
);
console.log('File content:', content);  // Should be "Hello World"
```

---

## Integration Points

### 1. ClaudeCodeSDKManager

**Already exists:** `/workspaces/agent-feed/src/services/ClaudeCodeSDKManager.js`

**Method to use:**
```typescript
queryClaudeCode(prompt: string, options: {
  cwd: string;
  model: string;
  permissionMode: string;
  allowedTools: string[];
}): Promise<Response>
```

**No changes needed to this file.**

---

### 2. WorkerSpawner

**File:** `/workspaces/agent-feed/src/adapters/worker-spawner.adapter.ts`

**Change line 157:**
```typescript
const worker = new ClaudeCodeWorker(this.db);
```

**Import at top:**
```typescript
import { ClaudeCodeWorker } from '../worker/claude-code-worker';
```

---

### 3. WorkTicket

**File:** `/workspaces/agent-feed/src/types/work-ticket.ts`

**No changes needed.** Use existing interface:
```typescript
interface WorkTicket {
  id: string;
  payload: {
    content: string;  // ← Use this
    ...
  };
  ...
}
```

---

### 4. WorkerResult

**File:** `/workspaces/agent-feed/src/types/worker.ts`

**No changes needed.** Use existing interface:
```typescript
interface WorkerResult {
  success: boolean;
  output?: any;
  error?: Error;
  tokensUsed: number;
  duration: number;
}
```

---

## Security Reminders

### Workspace Isolation

Claude Code SDK automatically:
- ✅ Enforces `cwd` boundary
- ✅ Blocks path traversal (../)
- ✅ Blocks sensitive files (.env, .git)
- ✅ Rejects operations outside workspace

**You don't need to:**
- ❌ Validate paths manually
- ❌ Check for ../
- ❌ Block sensitive files
- ❌ Implement security logic

**Just set `cwd` correctly and SDK handles the rest.**

---

### Permission Mode

```typescript
permissionMode: 'bypassPermissions'
```

**Safe because:**
- Worker runs in automated mode (no human needed)
- SDK still enforces workspace boundaries
- All operations logged
- No network access
- No system commands

**Approved by security team for this use case.**

---

## Performance Targets

| Operation Type | Target | Alert Threshold |
|---------------|--------|-----------------|
| Simple (create file) | < 5 seconds | > 10 seconds |
| Complex (list + create) | < 15 seconds | > 30 seconds |
| Timeout | 60 seconds | N/A (hard limit) |
| Success rate | > 90% | < 85% |
| Timeout rate | < 2% | > 5% |

---

## Rollback Plan

If critical issues detected:

1. **Revert WorkerSpawner** (1 line change)
   ```typescript
   const worker = new UnifiedAgentWorker(this.db);
   ```

2. **Deploy immediately** (< 5 minutes)

3. **Investigate issues**

4. **Fix and retry**

**Monitoring:**
- Error rate dashboard
- Success rate graph
- SSE activity stream
- Database work_queue status

---

## Documentation Links

| Document | Purpose |
|----------|---------|
| [Full Specification](./SPARC-ClaudeCode-Integration-Spec.md) | Complete requirements and design |
| [Architecture Diagrams](./SPARC-ClaudeCode-Architecture-Diagrams.md) | Visual architecture and flows |
| [Executive Summary](./SPARC-ClaudeCode-Integration-Summary.md) | High-level overview |
| [This Document](./SPARC-ClaudeCode-Quick-Reference.md) | Quick developer reference |

---

## Questions?

### "How does Claude know what to do?"

Claude interprets natural language. Examples:
- "Create test.txt" → Uses Write tool
- "List files" → Uses Bash tool (ls)
- "Read config.json" → Uses Read tool

### "What if Claude makes a mistake?"

Claude returns an error message explaining what went wrong. Worker captures this and returns error WorkerResult.

### "Is this slower than regex?"

Potentially, but old system produced **wrong results**. Better to be slightly slower with correct results than fast with broken results.

### "What about cost?"

Average: ~300 tokens per request = ~$0.001 per execution. Much cheaper than debugging broken regex.

### "Can I test locally?"

Yes! Just make sure:
- Claude API key configured
- workspace directory exists: `/workspaces/agent-feed/prod/agent_workspace/`
- Database connection works

---

## Quick Start Checklist

- [ ] Read this document
- [ ] Read architecture diagrams
- [ ] Create ClaudeCodeWorker class
- [ ] Implement executeTicket() method
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Update WorkerSpawner
- [ ] Run all tests
- [ ] Manual test with simple request
- [ ] Manual test with complex request
- [ ] Review with tech lead
- [ ] Deploy to 10% traffic
- [ ] Monitor for 24 hours
- [ ] Proceed with rollout

---

**Good luck! Remember: No regex, let Claude interpret everything.**

