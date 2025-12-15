# broadcastToSSE - Quick Reference

## Import
```javascript
import { broadcastToSSE } from '../api-server/server.js';
```

## Basic Usage
```javascript
broadcastToSSE({
  type: 'tool_activity',
  data: {
    tool: 'Bash',
    action: 'git status',
    priority: 'high'
  }
});
```

## Message Format

### Required Fields
- `type` (string): Message type
- `data` (object): Message data
- `data.priority` (string): 'high', 'medium', or 'low'

### Auto-Added Fields
- `id` (string): UUID (auto-generated if missing)
- `data.timestamp` (number): Unix timestamp (auto-added if missing)

### Complete Message Structure (after validation)
```javascript
{
  id: "uuid-here",
  type: "tool_activity",
  data: {
    message: "",              // Auto-added by validator
    priority: "high",
    timestamp: 1234567890,
    tool: "Bash",
    action: "git status",
    metadata: {}              // Optional
  }
}
```

## Tool Activity Examples

### Bash Command
```javascript
broadcastToSSE({
  type: 'tool_activity',
  data: {
    tool: 'Bash',
    action: 'git status --short',
    priority: 'high'
  }
});
```

### File Operations
```javascript
// Read
broadcastToSSE({
  type: 'tool_activity',
  data: {
    tool: 'Read',
    action: 'file.tsx',
    priority: 'high'
  }
});

// Edit
broadcastToSSE({
  type: 'tool_activity',
  data: {
    tool: 'Edit',
    action: 'file.tsx (line 42)',
    priority: 'high'
  }
});

// Write
broadcastToSSE({
  type: 'tool_activity',
  data: {
    tool: 'Write',
    action: 'new-file.tsx',
    priority: 'high'
  }
});
```

### Task Agent
```javascript
broadcastToSSE({
  type: 'tool_activity',
  data: {
    tool: 'Task',
    action: 'E2E Playwright testing with screenshots',
    priority: 'high'
  }
});
```

### Search Operations
```javascript
// Grep
broadcastToSSE({
  type: 'tool_activity',
  data: {
    tool: 'Grep',
    action: 'pattern: async function',
    priority: 'high'
  }
});

// Glob
broadcastToSSE({
  type: 'tool_activity',
  data: {
    tool: 'Glob',
    action: '**/*.test.ts',
    priority: 'high'
  }
});
```

### Error Broadcasting
```javascript
broadcastToSSE({
  type: 'error',
  data: {
    tool: 'Claude',
    action: 'API request failed',
    priority: 'high',
    metadata: {
      error: 'Timeout after 30s',
      severity: 'high'
    }
  }
});
```

## Priority Levels

### HIGH (always shown)
- Tool executions: Bash, Read, Write, Edit, Task, Grep, Glob
- Errors and failures
- Phase transitions

```javascript
priority: 'high'
```

### MEDIUM (filtered by frontend)
- System updates
- Info messages

```javascript
priority: 'medium'
```

### LOW (typically hidden)
- Heartbeats
- Connection status

```javascript
priority: 'low'
```

## Custom Connection Pool
```javascript
const customConnections = new Set([client1, client2]);

broadcastToSSE({
  type: 'tool_activity',
  data: { tool: 'Bash', action: 'test', priority: 'high' }
}, customConnections);
```

## Error Handling

### Invalid Message (silent failure)
```javascript
broadcastToSSE({});  // Logs error, returns early
broadcastToSSE({ type: 'test' });  // Logs error (missing data)
```

### Write Failure (graceful)
```javascript
// If client.write() throws:
// - Logs warning
// - Removes dead client
// - Continues to other clients
```

## Testing

### Run Tests
```bash
# All broadcast tests
npm test -- broadcast --run

# Unit tests only
npm test -- broadcast-sse.test.js --run

# Integration tests
npm test -- broadcast-sse-integration.test.js --run

# Manual verification
node tests/verify-export.mjs
```

### Expected Output
```
✓ tests/broadcast-sse.test.js (10 tests)
✓ tests/broadcast-sse-integration.test.js (4 tests)

Test Files  2 passed (2)
     Tests  14 passed (14)
```

## Common Patterns

### Claude Code Integration
```javascript
// In streaming-chat route
import { broadcastToSSE } from '../../api-server/server.js';

// On tool execution
const toolName = chunk.content_block.name;
const toolInput = chunk.content_block.input;

broadcastToSSE({
  type: 'tool_activity',
  data: {
    tool: formatToolName(toolName),
    action: formatToolAction(toolName, toolInput),
    priority: 'high'
  }
});
```

### Sequence of Tools
```javascript
// Read → Edit → Test
broadcastToSSE({ type: 'tool_activity', data: { tool: 'Read', action: 'file.tsx', priority: 'high' }});
broadcastToSSE({ type: 'tool_activity', data: { tool: 'Edit', action: 'file.tsx', priority: 'high' }});
broadcastToSSE({ type: 'tool_activity', data: { tool: 'Bash', action: 'npm test', priority: 'high' }});
```

### With Metadata
```javascript
broadcastToSSE({
  type: 'tool_activity',
  data: {
    tool: 'Bash',
    action: 'npm test',
    priority: 'high',
    metadata: {
      duration_ms: 2500,
      exit_code: 0,
      success: true
    }
  }
});
```

## SSE Message Format (on wire)
```
data: {"id":"uuid","type":"tool_activity","data":{"message":"","priority":"high","timestamp":1234567890,"tool":"Bash","action":"git status"}}\n\n
```

## Frontend Reception
```javascript
// In useActivityStream hook
eventSource.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'tool_activity' && message.data.priority === 'high') {
    // Display in AviTypingIndicator
    setActivity(`${message.data.tool}(${message.data.action})`);
  }
};
```

## Troubleshooting

### No Messages Received
1. Check SSE connection is open
2. Verify `sseConnections` Set has clients
3. Check message format is valid

### Messages Not Displayed
1. Verify priority is 'high'
2. Check frontend filters
3. Inspect browser console for errors

### Dead Connections Building Up
- Function automatically cleans up dead connections
- Check logs for: `🧹 Removed N dead SSE connection(s)`

## Performance

- **Latency**: <10ms typical
- **Throughput**: Tested with 100 rapid messages
- **Scalability**: O(n) per broadcast where n = client count
- **Memory**: Auto-cleanup of dead connections

## Files
- Implementation: `/workspaces/agent-feed/api-server/server.js:241-297`
- Unit Tests: `/workspaces/agent-feed/api-server/tests/broadcast-sse.test.js`
- Integration Tests: `/workspaces/agent-feed/api-server/tests/broadcast-sse-integration.test.js`
- Verification: `/workspaces/agent-feed/api-server/tests/verify-export.mjs`
- Docs: `/workspaces/agent-feed/api-server/BROADCAST_SSE_IMPLEMENTATION.md`
