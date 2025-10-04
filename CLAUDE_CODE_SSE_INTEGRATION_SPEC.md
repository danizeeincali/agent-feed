# Claude Code SSE Integration - SPARC Specification

## Objective
Integrate Claude Code tool execution events with the SSE streaming ticker to broadcast real-time activity to the Avi Activity Indicator.

## Requirements

### Functional Requirements
1. **Broadcast tool executions** from Claude Code to SSE stream
2. **Message format** must match existing SSE structure
3. **Priority assignment** based on tool importance
4. **Real-time streaming** with minimal latency (<100ms)
5. **No mock data** - only real Claude Code activity

### Activity Types to Broadcast

#### HIGH Priority (always show)
- **Tool Execution**: Bash, Read, Write, Edit, Grep, Glob
- **Task Spawning**: Task tool with agent descriptions
- **Phase Descriptions**: SPARC phase transitions
- **Error Events**: Critical failures, timeouts

#### MEDIUM Priority (filtered out)
- Heartbeats
- Connection status updates
- System health checks

#### Message Format
```json
{
  "type": "tool_activity",
  "data": {
    "tool": "Bash",
    "action": "git status --short",
    "priority": "high",
    "timestamp": 1234567890,
    "metadata": {
      "duration_ms": 150,
      "success": true
    }
  }
}
```

### Integration Points

#### 1. Claude Code SDK Route (`/api/claude-code/streaming-chat`)
**Location**: `/workspaces/agent-feed/src/api/routes/claude-code-sdk.js`

**Changes Required:**
- Import SSE broadcast function from server
- Hook into Claude Code's tool execution events
- Format and broadcast each tool call
- Handle streaming responses properly

#### 2. SSE Server (`/api/streaming-ticker/stream`)
**Location**: `/workspaces/agent-feed/api-server/server.js`

**Changes Required:**
- Export `broadcastToSSE()` function
- Accept external activity broadcasts
- Maintain connection pool
- Validate message format

### Technical Constraints
- **No breaking changes** to existing SSE clients
- **Backward compatible** message format
- **Performance**: <100ms broadcast latency
- **Reliability**: No lost messages during streaming
- **Error handling**: Graceful degradation on failures

### Data Flow
```
Claude Code Tool Execution
  ↓
Extract tool name & action
  ↓
Format SSE message (high priority)
  ↓
broadcastToSSE(message)
  ↓
SSE Server broadcasts to all clients
  ↓
useActivityStream receives message
  ↓
Filters for high priority
  ↓
Updates Avi Activity Indicator
  ↓
Display: "Avi - Tool(action)"
```

### Success Criteria
✅ Real tool executions broadcast to SSE
✅ Messages appear in Avi typing indicator
✅ No mock/simulated data
✅ <100ms latency from tool execution to display
✅ All tests passing
✅ E2E validation with screenshots
✅ No console errors
✅ Graceful error handling

## Non-Functional Requirements
- **Performance**: Minimal overhead on Claude Code execution
- **Scalability**: Support multiple concurrent SSE clients
- **Reliability**: Message delivery guaranteed (at-least-once)
- **Security**: No sensitive data in broadcasts
- **Logging**: Debug logging for troubleshooting

## Testing Requirements
- **Unit Tests**: broadcastToSSE function
- **Integration Tests**: Claude Code → SSE → Frontend
- **E2E Tests**: Full flow with Playwright screenshots
- **Load Tests**: Multiple concurrent Claude Code requests
- **Error Tests**: SSE connection failures, malformed messages

## Examples

### Example 1: Bash Tool Execution
**Input** (Claude Code executes):
```javascript
// Claude executes: bash("git status --short")
```

**SSE Broadcast**:
```json
{
  "type": "tool_activity",
  "data": {
    "tool": "Bash",
    "action": "git status --short",
    "priority": "high",
    "timestamp": 1759520000000
  }
}
```

**Frontend Display**:
```
Avi - Bash(git status --short)
```

### Example 2: Task Agent Spawn
**Input** (Claude spawns agent):
```javascript
// Claude executes: Task("E2E Playwright validation with screenshots")
```

**SSE Broadcast**:
```json
{
  "type": "tool_activity",
  "data": {
    "tool": "Task",
    "action": "E2E Playwright validation with screenshots",
    "priority": "high",
    "timestamp": 1759520001000
  }
}
```

**Frontend Display**:
```
Avi - Task(E2E Playwright validation with screenshots)
```

### Example 3: Multiple Rapid Tools
**Input** (Claude executes sequence):
```javascript
1. Read("file.tsx")
2. Edit("file.tsx")
3. Bash("npm test")
```

**SSE Broadcasts** (3 separate messages):
```json
{"type": "tool_activity", "data": {"tool": "Read", "action": "file.tsx", ...}}
{"type": "tool_activity", "data": {"tool": "Edit", "action": "file.tsx", ...}}
{"type": "tool_activity", "data": {"tool": "Bash", "action": "npm test", ...}}
```

**Frontend Display** (updates 3 times):
```
t=0ms:   Avi - Read(file.tsx)
t=50ms:  Avi - Edit(file.tsx)
t=100ms: Avi - Bash(npm test)
```

## Rollback Plan
If integration causes issues:
1. Disable broadcasting with feature flag
2. Revert to mock initial messages only
3. SSE stream continues working
4. No impact on Claude Code functionality

## Security Considerations
- **No API keys** in broadcasts
- **No file contents** in action descriptions
- **Truncate long paths** to prevent data leakage
- **Sanitize user input** in task descriptions
