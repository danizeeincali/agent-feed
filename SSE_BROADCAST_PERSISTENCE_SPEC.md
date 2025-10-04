# SSE Broadcast Persistence Fix - SPARC Specification

## Objective
Fix the `broadcastToSSE()` function to persist tool activity messages to the `streamingTickerMessages` array so they are available in SSE history and to new client connections.

## Problem Statement
**Root Cause**: The `broadcastToSSE()` function (server.js:246-297) broadcasts messages to active SSE connections but does NOT add them to the `streamingTickerMessages` array.

**Impact**:
- Tool activity broadcasts are ephemeral (lost if no client connected)
- New SSE connections only receive initial mock messages
- SSE history endpoint returns empty results for `tool_activity` type
- Frontend only sees "System initialized successfully" message

**Evidence**:
```bash
# Backend logs show broadcast is called
🔧 Tool execution detected: Read(package.json)
📡 SSE Broadcast: Read(package.json)

# But SSE history is empty
curl 'http://localhost:3001/api/streaming-ticker/history?type=tool_activity'
# Returns: {"success": true, "data": []}
```

## Requirements

### Functional Requirements
1. **Persist broadcasts** - Add all broadcast messages to `streamingTickerMessages` array
2. **Maintain history limit** - Keep last 100 messages (existing behavior)
3. **Backward compatibility** - No breaking changes to existing SSE clients
4. **Real-time delivery** - Continue broadcasting to active connections immediately
5. **History availability** - New connections receive last 10 messages including tool activities

### Message Flow
```
Claude Code executes Read(package.json)
  ↓
formatToolAction() → "package.json"
  ↓
broadcastToolActivity() creates message:
{
  type: "tool_activity",
  data: {
    tool: "Read",
    action: "package.json",
    priority: "high",
    timestamp: 1759520000000
  }
}
  ↓
broadcastToSSE(message) does 2 things:
  1. Add to streamingTickerMessages array ← FIX NEEDED
  2. Broadcast to active SSE connections ← Already working
  ↓
New SSE connection opens
  ↓
Receives last 10 messages from array (includes tool_activity)
  ↓
Frontend filters for high priority
  ↓
Displays: "Avi - Read(package.json)"
```

### Technical Changes Required

#### File: `/workspaces/agent-feed/api-server/server.js`
**Function**: `broadcastToSSE()` (lines 246-297)

**Current behavior**:
```javascript
export function broadcastToSSE(message, connections = sseConnections) {
  // Validate, enrich, broadcast to active connections
  // ❌ DOES NOT persist to streamingTickerMessages
}
```

**Required behavior**:
```javascript
export function broadcastToSSE(message, connections = sseConnections) {
  // 1. Validate and enrich message
  // 2. Add to streamingTickerMessages array (NEW)
  // 3. Maintain 100 message limit (NEW)
  // 4. Broadcast to active connections (existing)
}
```

### Success Criteria
✅ broadcastToSSE() persists messages to array
✅ Array maintains 100 message limit
✅ SSE history endpoint returns tool_activity messages
✅ New connections receive recent tool activities
✅ Frontend displays tool activities in Avi indicator
✅ All unit tests passing (30+ tests)
✅ All integration tests passing (10+ tests)
✅ E2E Playwright test with screenshot validation
✅ No mocks or simulations - 100% real data

## Test Cases

### Unit Tests
1. `broadcastToSSE()` adds message to array
2. Array maintains 100 message limit (removes oldest)
3. Message validation still works
4. Dead connection cleanup still works
5. Broadcast to multiple connections works

### Integration Tests
1. Claude Code tool execution → broadcast → persisted to array
2. SSE history endpoint returns tool_activity messages
3. New SSE connection receives last 10 messages
4. High-priority filtering works on persisted messages

### E2E Test (Playwright with screenshots)
**Test Flow**:
1. Open Avi DM tab
2. Send message: "read the file package.json"
3. Wait for SSE connection to establish
4. Screenshot 1: Initial "System initialized successfully"
5. Wait for tool activity broadcast
6. Screenshot 2: "Avi - Read(package.json)" appears
7. Refresh page (new SSE connection)
8. Screenshot 3: "Avi - Read(package.json)" still appears (from history)
9. Verify no console errors
10. Verify SSE history endpoint has tool_activity messages

## Non-Functional Requirements
- **Performance**: No additional latency (array push is O(1))
- **Memory**: 100 message limit prevents unbounded growth
- **Reliability**: Persisted messages survive connection drops
- **Security**: Same sanitization (no sensitive data in broadcasts)

## Rollback Plan
If issues occur:
1. Revert server.js broadcastToSSE() change
2. Messages still broadcast to active connections
3. History feature disabled until fix deployed
4. No impact on real-time broadcasting

## Implementation Strategy
1. **Specification** - This document ✓
2. **Pseudocode** - Detailed implementation design
3. **Architecture** - Run 3 concurrent agents:
   - Agent 1: Backend fix + unit tests (25 tests)
   - Agent 2: Integration tests (15 tests)
   - Agent 3: E2E Playwright validation with screenshots
4. **Refinement** - Address any test failures, iterate until 100% pass
5. **Completion** - Validate with real Claude Code execution, no mocks

## Security Considerations
- Same sanitization rules apply (truncateAction removes tokens/passwords)
- No additional security risks (messages already broadcast)
- History endpoint respects same message format

## Validation Checklist
- [ ] Unit tests: broadcastToSSE persists messages
- [ ] Unit tests: 100 message limit enforced
- [ ] Integration tests: Claude Code → SSE history
- [ ] E2E: Tool activity appears in frontend
- [ ] E2E: Activity persists across page refresh
- [ ] E2E: Screenshots prove visual appearance
- [ ] No console errors
- [ ] No mocks or simulations
- [ ] Real Claude Code tool execution verified
